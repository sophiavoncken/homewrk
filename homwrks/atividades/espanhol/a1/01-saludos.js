const saludosEs = {
    titulo: "Saludos",
    nivel: "A1",

    atividades: [
        {
            tipo: "multipla",
            pergunta: "How do you say 'hello' in Spanish?",
            opcoes: ["Hola", "Adiós", "Gracias"],
            correta: 0,
            explicacao: "'Hello' se dice 'hola'."
        },
        {
            tipo: "escrita",
            pergunta: "Listen and write the greeting.",
            audio: "buenos días",
            resposta: "buenos dias",
            placeholder: "saludo",
            explicacao: "'Good morning' se dice 'buenos días'."
        },
        {
            tipo: "arrastar",
            pergunta: "Drag the farewell.",
            opcoes: ["Gracias", "Adiós", "Por favor"],
            correta: 1,
            caixa: "Respuesta",
            explicacao: "'Goodbye' se dice 'adiós'."
        },
        {
            tipo: "multipla",
            pergunta: "How do you say 'thank you' in Spanish?",
            opcoes: ["Perdón", "Gracias", "Buenas noches"],
            correta: 1,
            explicacao: "'Thank you' se dice 'gracias'."
        },
        {
            tipo: "multipla",
            pergunta: "How do you say 'please' in Spanish?",
            opcoes: ["Por favor", "Hasta luego", "Hola"],
            correta: 0,
            explicacao: "'Please' se dice 'por favor'."
        }
    ]
};
