# Homewrks

Plataforma local de atividades de idiomas com login, progresso salvo em banco SQLite e exercícios de múltipla escolha, escrita, áudio e arrastar/soltar.

## Como abrir

Na pasta do projeto, rode:

```bash
python3 server.py
```

Depois acesse:

```text
http://127.0.0.1:8060/
```

Importante: depois da integração com banco de dados, abra pelo endereço acima. Abrir `index.html` diretamente não ativa login, sessões nem progresso salvo.

## O que já existe

- Cadastro, login e logout.
- Banco local SQLite em `data/homewrks.sqlite3`.
- Progresso por usuário e por atividade.
- Inglês, francês e espanhol.
- Atividades A1 iniciais.
- Tipos de exercício:
  - múltipla escolha;
  - escrita;
  - áudio com voz do navegador;
  - arrastar/soltar.

## Próximos blocos de conteúdo

Estrutura sugerida para crescer do A1 ao B2:

- A1: apresentações, cores, números, família, escola, verbo ser/être/to be, artigos, pronomes.
- A2: rotina, comida, lugares da cidade, presente simples, perguntas, passado básico.
- B1: viagens, opiniões, narrativas, tempos verbais combinados, compreensão de pequenos textos.
- B2: debates, escrita guiada, conectores, vocabulário acadêmico/profissional, escuta com inferência.

Cada novo arquivo de atividade pode misturar os tipos `multipla`, `escrita` e `arrastar`.
