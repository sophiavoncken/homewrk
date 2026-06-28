const authPanel = document.getElementById("authPanel");
const appPanel = document.getElementById("appPanel");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubmit = document.getElementById("authSubmit");
const authToggle = document.getElementById("authToggle");
const nameField = document.getElementById("nameField");
const authMessage = document.getElementById("authMessage");
const userName = document.getElementById("userName");

let authMode = "login";

function setAuthMode(mode) {
    authMode = mode;
    const isRegister = mode === "register";
    authTitle.innerText = isRegister ? "Criar conta" : "Entrar";
    authSubmit.innerText = isRegister ? "Cadastrar" : "Entrar";
    authToggle.innerText = isRegister ? "Já tenho conta" : "Criar nova conta";
    nameField.style.display = isRegister ? "block" : "none";
    authMessage.innerText = "";
}

async function refreshAuth() {
    const { user } = await HomewrksAPI.me();
    if (user) {
        authPanel.style.display = "none";
        appPanel.style.display = "block";
        userName.innerText = user.name;
        return;
    }

    authPanel.style.display = "block";
    appPanel.style.display = "none";
}

authToggle.onclick = () => {
    setAuthMode(authMode === "login" ? "register" : "login");
};

authForm.onsubmit = async event => {
    event.preventDefault();
    authMessage.innerText = "";

    const form = new FormData(authForm);
    const payload = {
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password")
    };

    try {
        if (authMode === "register") {
            await HomewrksAPI.register(payload);
        } else {
            await HomewrksAPI.login(payload);
        }
        authForm.reset();
        await refreshAuth();
    } catch (error) {
        authMessage.innerText = error.message;
    }
};

async function logout() {
    await HomewrksAPI.logout();
    await refreshAuth();
}

setAuthMode("login");
refreshAuth();
