let atual = [];
let indice = 0;
let selecionado = null;
let acertos = 0;
let respondida = false;
let atividadeAtual = "";
let atividadeMeta = null;
let idioma = "en";
let dragResposta = null;

const perguntaEl = document.getElementById("pergunta");
const opcoesEl = document.getElementById("opcoes");
const feedbackEl = document.getElementById("feedback");
const barraEl = document.getElementById("barra");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const contadorEl = document.getElementById("contador");
const placarEl = document.getElementById("placar");
const tituloAtividadeEl = document.getElementById("tituloAtividade");
const checkBtn = document.getElementById("btn");
const mediaBox = document.getElementById("mediaBox");
const studentLine = document.getElementById("studentLine");

const atividades = {
    wh: () => whQuestions,
    verb: () => verbToBe,
    negative: () => negativeSentences,
    questions: () => questionsWithToBe,
    pronouns: () => pronouns,
    thisthat: () => thisThat,
    articles: () => articles,
    plurals: () => plurals,
    verb_fr: () => verbEtre,
    neg_fr: () => negation,
    q_fr: () => questionsFr,
    articles_fr: () => articlesFr,
    possessifs_fr: () => possessifsFr,
    couleurs_fr: () => couleursFr,
    saludos_es: () => saludosEs,
    ser_es: () => serEs,
    colores_es: () => coloresEs
};

const textos = {
    en: {
        select: "Select an option!",
        write: "Write your answer!",
        drag: "Drag an option to the box!",
        correct: "Correct!",
        wrong: "Not quite.",
        review: "Review the grammar rule and try the next one.",
        finished: "Finished!",
        final: score => `Great job! You got ${score.acertos} out of ${score.total}.`,
        count: (n, total) => `Question ${n} of ${total}`,
        score: n => `${n} correct`,
        resume: n => `Continuing from question ${n}.`
    },
    fr: {
        select: "Choisissez une option !",
        write: "Écrivez votre réponse !",
        drag: "Glissez une option dans la boîte !",
        correct: "Correct !",
        wrong: "Pas tout à fait.",
        review: "Relisez la règle et essayez la suivante.",
        finished: "Terminé !",
        final: score => `Bravo ! Vous avez ${score.acertos} bonne(s) réponse(s) sur ${score.total}.`,
        count: (n, total) => `Question ${n} sur ${total}`,
        score: n => `${n} correcte(s)`,
        resume: n => `Reprise à la question ${n}.`
    },
    es: {
        select: "Elige una opción.",
        write: "Escribe tu respuesta.",
        drag: "Arrastra una opción a la caja.",
        correct: "Correcto.",
        wrong: "Casi.",
        review: "Revisa la regla y prueba la siguiente.",
        finished: "Terminado.",
        final: score => `Muy bien. Tienes ${score.acertos} respuesta(s) correcta(s) de ${score.total}.`,
        count: (n, total) => `Pregunta ${n} de ${total}`,
        score: n => `${n} correctas`,
        resume: n => `Continuando desde la pregunta ${n}.`
    }
};

async function prepararAluno() {
    try {
        const { user } = await HomewrksAPI.me();
        if (!user) {
            window.location.href = "index.html";
            return;
        }
        if (studentLine) studentLine.innerText = `Aluno: ${user.name}`;
    } catch (error) {
        window.location.href = "index.html";
    }
}

function detectarIdioma() {
    if (window.location.href.includes("french")) return "fr";
    if (window.location.href.includes("spanish")) return "es";
    return "en";
}

async function iniciar(tipo) {
    idioma = detectarIdioma();
    atividadeAtual = tipo;
    atividadeMeta = atividades[tipo]();
    atual = atividadeMeta.atividades;

    document.getElementById("menu").style.display = "none";
    document.getElementById("quiz").style.display = "block";

    indice = 0;
    acertos = 0;
    selecionado = null;
    respondida = false;

    tituloAtividadeEl.innerText = atividadeMeta.titulo || "Practice";
    restartBtn.style.display = "none";

    await carregarProgresso();
    carregar();
}

async function carregarProgresso() {
    try {
        const { progress } = await HomewrksAPI.progress(chaveAtividade());
        if (progress && !progress.completed && progress.current_index < atual.length) {
            indice = progress.current_index;
            acertos = progress.correct;
            feedbackEl.innerText = textos[idioma].resume(indice + 1);
            feedbackEl.className = "warning";
        }
    } catch (error) {
        console.warn(error.message);
    }
}

function chaveAtividade() {
    return `${idioma}:${atividadeMeta?.nivel || atividadeMeta?.niveau || "A1"}:${atividadeAtual}`;
}

function carregar() {
    feedbackEl.innerHTML = "";
    feedbackEl.className = "";
    mediaBox.innerHTML = "";
    selecionado = null;
    dragResposta = null;
    respondida = false;
    nextBtn.style.display = "none";
    checkBtn.disabled = false;
    opcoesEl.innerHTML = "";

    const q = atual[indice];
    perguntaEl.innerText = q.pergunta;
    contadorEl.innerText = textos[idioma].count(indice + 1, atual.length);
    placarEl.innerText = textos[idioma].score(acertos);

    renderMedia(q);

    if (q.tipo === "escrita") renderEscrita(q);
    else if (q.tipo === "arrastar") renderArrastar(q);
    else renderMultipla(q);

    atualizarBarra();
    salvarProgresso(false);
}

function renderMedia(q) {
    const audioText = q.audio || q.fraseAudio;
    if (!audioText) return;

    const button = document.createElement("button");
    button.className = "audio-button";
    button.type = "button";
    button.innerText = "▶ Audio";
    button.onclick = () => falar(audioText);
    mediaBox.appendChild(button);
}

function falar(texto) {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = idioma === "fr" ? "fr-FR" : idioma === "es" ? "es-ES" : "en-US";
    utterance.rate = 0.86;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function renderMultipla(q) {
    q.opcoes.forEach((op, i) => {
        const div = document.createElement("button");
        div.classList.add("opcao");
        div.type = "button";
        div.innerText = op;

        div.onclick = () => {
            if (respondida) return;
            document.querySelectorAll(".opcao").forEach(o => o.classList.remove("selecionado"));
            div.classList.add("selecionado");
            selecionado = i;
        };

        opcoesEl.appendChild(div);
    });
}

function renderEscrita(q) {
    const label = document.createElement("label");
    label.className = "writing-card";
    label.innerHTML = `<span>${q.instrucao || "Write the answer"}</span>`;

    const input = document.createElement("input");
    input.id = "respostaEscrita";
    input.type = "text";
    input.autocomplete = "off";
    input.placeholder = q.placeholder || "...";
    label.appendChild(input);
    opcoesEl.appendChild(label);
    input.focus();
}

function renderArrastar(q) {
    const area = document.createElement("div");
    area.className = "drag-area";

    const options = document.createElement("div");
    options.className = "drag-options";

    q.opcoes.forEach((op, i) => {
        const item = document.createElement("button");
        item.className = "drag-chip";
        item.type = "button";
        item.draggable = true;
        item.innerText = op;
        item.dataset.index = i;
        item.addEventListener("dragstart", event => {
            event.dataTransfer.setData("text/plain", String(i));
        });
        item.onclick = () => colocarNaCaixa(i, op);
        options.appendChild(item);
    });

    const drop = document.createElement("div");
    drop.className = "drop-box";
    drop.innerText = q.caixa || "Drop here";
    drop.addEventListener("dragover", event => event.preventDefault());
    drop.addEventListener("drop", event => {
        event.preventDefault();
        const i = Number(event.dataTransfer.getData("text/plain"));
        colocarNaCaixa(i, q.opcoes[i]);
    });

    area.appendChild(options);
    area.appendChild(drop);
    opcoesEl.appendChild(area);
}

function colocarNaCaixa(index, texto) {
    if (respondida) return;
    dragResposta = index;
    const drop = document.querySelector(".drop-box");
    drop.innerText = texto;
    drop.classList.add("selecionado");
}

function atualizarBarra() {
    barraEl.style.width = ((indice + 1) / atual.length) * 100 + "%";
}

checkBtn.onclick = function () {
    const q = atual[indice];
    let correto = false;

    if (q.tipo === "escrita") {
        const input = document.getElementById("respostaEscrita");
        if (!input.value.trim()) {
            mostrarAviso(textos[idioma].write);
            return;
        }
        correto = normalizar(input.value) === normalizar(q.resposta);
        input.disabled = true;
    } else if (q.tipo === "arrastar") {
        if (dragResposta === null) {
            mostrarAviso(textos[idioma].drag);
            return;
        }
        correto = dragResposta === q.correta;
        document.querySelectorAll(".drag-chip").forEach((chip, i) => {
            chip.disabled = true;
            if (i === q.correta) chip.classList.add("correta");
            if (i === dragResposta && i !== q.correta) chip.classList.add("errada");
        });
    } else {
        if (selecionado === null) {
            mostrarAviso(textos[idioma].select);
            return;
        }
        correto = selecionado === q.correta;
        document.querySelectorAll(".opcao").forEach((opcao, i) => {
            opcao.disabled = true;
            if (i === q.correta) opcao.classList.add("correta");
            if (i === selecionado && i !== q.correta) opcao.classList.add("errada");
        });
    }

    respondida = true;
    checkBtn.disabled = true;

    if (correto) {
        acertos++;
        feedbackEl.innerHTML = `✔ ${textos[idioma].correct}`;
        feedbackEl.className = "success";
    } else {
        feedbackEl.innerHTML = `✖ ${textos[idioma].wrong}<br>${q.explicacao || textos[idioma].review}`;
        feedbackEl.className = "error";
    }

    placarEl.innerText = textos[idioma].score(acertos);
    nextBtn.style.display = "block";
    salvarProgresso(false);
};

function normalizar(valor) {
    return valor
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.!?]/g, "");
}

function mostrarAviso(texto) {
    feedbackEl.innerText = texto;
    feedbackEl.className = "warning";
}

function proxima() {
    indice++;
    selecionado = null;

    if (indice < atual.length) {
        carregar();
        return;
    }

    perguntaEl.innerHTML = textos[idioma].finished;
    contadorEl.innerText = "";
    mediaBox.innerHTML = "";
    opcoesEl.innerHTML = "";
    feedbackEl.innerHTML = textos[idioma].final({ acertos, total: atual.length });
    feedbackEl.className = "success";
    nextBtn.style.display = "none";
    restartBtn.style.display = "block";
    checkBtn.disabled = true;
    barraEl.style.width = "100%";
    salvarProgresso(true);
}

function anterior() {
    if (indice > 0) {
        indice--;
        carregar();
    }
}

function reiniciar() {
    iniciar(atividadeAtual);
}

function voltarMenu() {
    document.getElementById("quiz").style.display = "none";
    document.getElementById("menu").style.display = "block";
}

async function salvarProgresso(completed) {
    if (!atividadeMeta) return;

    try {
        await HomewrksAPI.saveProgress({
            activity_key: chaveAtividade(),
            language: idioma,
            level: atividadeMeta.nivel || atividadeMeta.niveau || "A1",
            activity_title: atividadeMeta.titulo || "Practice",
            current_index: Math.min(indice, atual.length - 1),
            correct: acertos,
            total: atual.length,
            completed
        });
    } catch (error) {
        console.warn(error.message);
    }
}

async function logout() {
    await HomewrksAPI.logout();
    window.location.href = "index.html";
}

prepararAluno();
