# StudyAgent — Gerador Inteligente de Questões e Flashcards

## 📖 Sobre

O **StudyAgent** é uma aplicação web para estudantes de alto rendimento que se preparam para concursos públicos. O sistema atua como um agente educacional autônomo que:

- Recebe textos ou PDFs de estudo
- Gera automaticamente questões no estilo de concurso público (via Google Gemini 2.0 Flash)
- Cria flashcards com repetição espaçada (algoritmo SM-2 simplificado)
- Fornece feedback inteligente baseado no desempenho

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript |
| Estilização | Tailwind CSS |
| Backend/Auth/DB | Firebase (Auth + Firestore) |
| IA | Google Gemini 2.0 Flash |
| Extração de PDF | pdf.js (pdfjs-dist) |

## 🚀 Como Rodar Localmente

1. `npm install`
2. Crie `.env` com as variáveis (veja `FIREBASE_SETUP.md`)
3. `npm run dev`

## 🎯 Funcionalidades

1. **Autenticação** — Login/cadastro com Firebase Auth
2. **Dashboard** — Estatísticas de desempenho
3. **Upload** — Texto ou PDF para gerar conteúdo via IA
4. **Questões** — Interface de prova com feedback imediato
5. **Flashcards** — Repetição espaçada (SM-2)
6. **Feedback IA** — Análise pós-sessão personalizada
