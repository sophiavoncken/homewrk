import sqlite3
import hashlib
import base64
import os
import time

DB = "data/homewrks.sqlite3"

def hash_password(password):
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120000)
    return base64.b64encode(salt + digest).decode()

email = "aluno@homewrks.local"
name = "Aluno"
password = "123456"

conn = sqlite3.connect(DB)
cursor = conn.cursor()

cursor.execute("""
INSERT INTO users (name, email, password_hash, created_at)
VALUES (?, ?, ?, ?)
""", (
    name,
    email,
    hash_password(password),
    int(time.time())
))

conn.commit()
conn.close()

print("Usuário criado com sucesso!")
print("Email:", email)
print("Senha:", password)