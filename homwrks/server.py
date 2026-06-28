from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "homewrks.sqlite3"
SESSION_SECONDS = 60 * 60 * 24 * 14


def connect():
    DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS progress (
                user_id INTEGER NOT NULL,
                activity_key TEXT NOT NULL,
                language TEXT NOT NULL,
                level TEXT NOT NULL,
                activity_title TEXT NOT NULL,
                current_index INTEGER NOT NULL DEFAULT 0,
                correct INTEGER NOT NULL DEFAULT 0,
                total INTEGER NOT NULL DEFAULT 0,
                completed INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (user_id, activity_key),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """
        )


def hash_password(password):
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return base64.b64encode(salt + digest).decode("ascii")


def verify_password(password, stored):
    raw = base64.b64decode(stored.encode("ascii"))
    salt, digest = raw[:16], raw[16:]
    check = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return hmac.compare_digest(digest, check)


def json_response(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    if length == 0:
        return {}
    return json.loads(handler.rfile.read(length).decode("utf-8"))


def make_session(user_id):
    token = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + SESSION_SECONDS
    with connect() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at),
        )
    return token, expires_at


def get_session_user(handler):
    header = handler.headers.get("Cookie", "")
    jar = cookies.SimpleCookie(header)
    morsel = jar.get("homewrks_session")
    if not morsel:
        return None

    token = morsel.value
    now = int(time.time())
    with connect() as conn:
        row = conn.execute(
            """
            SELECT users.id, users.name, users.email
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ? AND sessions.expires_at > ?
            """,
            (token, now),
        ).fetchone()
    return dict(row) if row else None


def require_user(handler):
    user = get_session_user(handler)
    if not user:
        json_response(handler, 401, {"error": "Login required"})
        return None
    return user


class HomewrksHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/me":
            user = get_session_user(self)
            json_response(self, 200, {"user": user})
            return

        if parsed.path == "/api/progress":
            user = require_user(self)
            if not user:
                return
            params = parse_qs(parsed.query)
            activity_key = params.get("activity_key", [None])[0]
            with connect() as conn:
                if activity_key:
                    row = conn.execute(
                        "SELECT * FROM progress WHERE user_id = ? AND activity_key = ?",
                        (user["id"], activity_key),
                    ).fetchone()
                    json_response(self, 200, {"progress": dict(row) if row else None})
                else:
                    rows = conn.execute(
                        "SELECT * FROM progress WHERE user_id = ? ORDER BY updated_at DESC",
                        (user["id"],),
                    ).fetchall()
                    json_response(self, 200, {"progress": [dict(row) for row in rows]})
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/register":
            data = read_json(self)
            name = (data.get("name") or "").strip()
            email = (data.get("email") or "").strip().lower()
            password = data.get("password") or ""

            if len(name) < 2 or "@" not in email or len(password) < 6:
                json_response(self, 400, {"error": "Preencha nome, email e senha com pelo menos 6 caracteres."})
                return

            try:
                with connect() as conn:
                    cursor = conn.execute(
                        "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                        (name, email, hash_password(password), int(time.time())),
                    )
                    user_id = cursor.lastrowid
            except sqlite3.IntegrityError:
                json_response(self, 409, {"error": "Este email já está cadastrado."})
                return

            token, expires_at = make_session(user_id)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", f"homewrks_session={token}; Path=/; Max-Age={SESSION_SECONDS}; SameSite=Lax")
            self.end_headers()
            self.wfile.write(json.dumps({"user": {"id": user_id, "name": name, "email": email}, "expires_at": expires_at}).encode("utf-8"))
            return

        if parsed.path == "/api/login":
            data = read_json(self)
            email = (data.get("email") or "").strip().lower()
            password = data.get("password") or ""

            with connect() as conn:
                row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

            if not row or not verify_password(password, row["password_hash"]):
                json_response(self, 401, {"error": "Email ou senha incorretos."})
                return

            token, expires_at = make_session(row["id"])
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", f"homewrks_session={token}; Path=/; Max-Age={SESSION_SECONDS}; SameSite=Lax")
            self.end_headers()
            self.wfile.write(json.dumps({"user": {"id": row["id"], "name": row["name"], "email": row["email"]}, "expires_at": expires_at}).encode("utf-8"))
            return

        if parsed.path == "/api/logout":
            header = self.headers.get("Cookie", "")
            jar = cookies.SimpleCookie(header)
            morsel = jar.get("homewrks_session")
            if morsel:
                with connect() as conn:
                    conn.execute("DELETE FROM sessions WHERE token = ?", (morsel.value,))
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", "homewrks_session=; Path=/; Max-Age=0; SameSite=Lax")
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return

        if parsed.path == "/api/progress":
            user = require_user(self)
            if not user:
                return

            data = read_json(self)
            required = ["activity_key", "language", "level", "activity_title"]
            if any(not data.get(field) for field in required):
                json_response(self, 400, {"error": "Dados de progresso incompletos."})
                return

            with connect() as conn:
                conn.execute(
                    """
                    INSERT INTO progress (
                        user_id, activity_key, language, level, activity_title,
                        current_index, correct, total, completed, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(user_id, activity_key) DO UPDATE SET
                        language = excluded.language,
                        level = excluded.level,
                        activity_title = excluded.activity_title,
                        current_index = excluded.current_index,
                        correct = excluded.correct,
                        total = excluded.total,
                        completed = excluded.completed,
                        updated_at = excluded.updated_at
                    """,
                    (
                        user["id"],
                        data["activity_key"],
                        data["language"],
                        data["level"],
                        data["activity_title"],
                        int(data.get("current_index", 0)),
                        int(data.get("correct", 0)),
                        int(data.get("total", 0)),
                        1 if data.get("completed") else 0,
                        int(time.time()),
                    ),
                )
            json_response(self, 200, {"ok": True})
            return

        json_response(self, 404, {"error": "Not found"})


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", 8060), HomewrksHandler)
    print("Homewrks running at http://127.0.0.1:8060/")
    server.serve_forever()
