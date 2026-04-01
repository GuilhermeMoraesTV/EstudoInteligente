# 🧠 Estudo Inteligente

> **Sistema Web com Agente de IA para estudos de concursos públicos** — geração automática de questões adaptativas, flashcards com repetição espaçada, memória persistente de desempenho e feedback personalizado pela IA.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-FFCA28?logo=firebase&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini%202.5%20Flash-4285F4?logo=google&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📌 Sobre o Projeto

O **Estudo Inteligente** é um agente de IA voltado ao aprendizado ativo para concursos públicos. Diferente de plataformas estáticas de questões, este sistema **aprende com o aluno** a cada sessão: os erros cometidos são armazenados, influenciam as próximas gerações de questões pela IA e geram automaticamente materiais de reforço.

### O problema que resolve

Estudantes de concursos públicos enfrentam três dificuldades principais:
- **Falta de questões variadas e atualizadas** sobre seus materiais específicos
- **Dificuldade de identificar pontos fracos** e focar neles
- **Abandono do estudo por falta de feedback** motivador e personalizado

O Estudo Inteligente resolve isso com um ciclo contínuo de **aprendizado → memória → adaptação**:

```
Upload do material
       ↓
IA mapeia assuntos automaticamente
       ↓
Questões geradas dinamicamente (3 tipos)
       ↓
Aluno responde → erros são MEMORIZADOS
       ↓
IA adapta próximas questões aos pontos fracos ← (ciclo)
       ↓
Flashcards de reforço criados automaticamente
       ↓
Revisão por repetição espaçada (SM-2)
       ↓
Feedback personalizado pela IA no resultado
```

---

## 🤖 Como o Agente de IA Funciona

O núcleo do sistema é o arquivo `src/services/aiService.ts`, que implementa 5 funções de IA especializadas usando o **Google Gemini 2.5 Flash**:

### 1. `mapearAssuntos(texto)` — Análise Pedagógica
Chamada logo após o upload. A IA analisa o texto (até 22.000 caracteres amostrados) e:
- Identifica entre **3 e 8 tópicos pedagógicos** do material
- Filtra automaticamente sumários, prefácios e apresentações
- Retorna títulos específicos (ex: "Concordância Verbal", não "Gramática")
- Extrai um trecho representativo de cada assunto do texto original

### 2. `gerarConteudoParaAssunto(assunto, tipo, qtd, erros)` — Geração Adaptativa
O coração do agente. Gera questões + flashcards com distribuição dinâmica de tipos:

| Tipo de Questão | Modo Flash | Modo Concurso |
|----------------|-----------|---------------|
| Múltipla Escolha (A-E) | 50% | 33% |
| Certo / Errado | 33% | 33% |
| Associação (I, II, III, IV) | 17% | 33% |

**Adaptação por memória**: o parâmetro `erros` recebe os últimos 5 erros do aluno. O prompt instrui a IA a reforçar exatamente esses pontos. Isso é o que transforma o sistema de um gerador estático em um **agente adaptativo**.

### 3. `gerarReforcoParaQuestao(pergunta, assunto)` — Reforço Direcionado
Quando o aluno clica em "Revisar" (📌) após responder:
- Gera 3 questões extras sobre o mesmo tema em ângulos diferentes
- Gera 3 flashcards de memorização adicionais
- Salva tudo vinculado ao mesmo assunto no Firestore

### 4. `gerarReforcoParaFlashcard(frente, verso, assunto)` — Reforço Automático
Acionado automaticamente quando o aluno avalia um flashcard como difícil:
- Recebe o conceito que o aluno não memorizou
- Gera 3 novos flashcards do mesmo conceito com abordagens diferentes
- Executa em background sem bloquear a interface

### 5. `gerarFeedbackDesempenho(taxa, temas)` — Feedback Personalizado
Ao final de cada sessão de estudos:
- Analisa a taxa de acerto e os temas com mais erros
- Gera um feedback motivador e estratégico em 2 frases
- Temperatura alta (0.8) para respostas criativas e variadas

---

## 💾 Sistema de Memória (Requisito Central)

O sistema implementa memória em **três camadas**:

### Camada 1 — Cache em Memória (Runtime)
```typescript
// aiService.ts
let cachedApiKey: string | null = null; // evita re-fetch da chave a cada chamada
```

### Camada 2 — Estado Adaptativo (Sessão)
```typescript
// Estudo.tsx
const errosRef = useRef<string[]>([]); // últimos 5 erros da sessão atual
// esses erros são passados para a IA na próxima geração de questões
```

### Camada 3 — Banco de Dados (Permanente)
Todo o histórico é persistido no **Cloud Firestore**:

| Coleção | O que memoriza |
|---------|---------------|
| `questoes` | Questões geradas pela IA para cada assunto |
| `flashcards` | Cards com dados SM-2: intervalo, facilidade, próxima revisão |
| `historico_respostas` | Cada resposta dada (acerto/erro, tempo gasto) |
| `materiais` | Material com assuntos identificados pela IA |
| `users` | Perfil e preferências do usuário (modo de revisão) |
| `configuracoes/chaves` | Chave da API Gemini (segura, fora do bundle) |

---

## ✨ Funcionalidades

- 📄 **Upload inteligente** — PDF (até 10MB via pdf.js) ou texto colado
- 🎯 **3 tipos de questão** — Múltipla escolha, Certo/Errado, Associação (estilo CESPE/FCC)
- 🧠 **IA adaptativa** — Aprende com erros e reforça pontos fracos automaticamente
- ✂️ **Eliminar alternativas** — Botão de "tesoura" por alternativa para narrowing
- 🃏 **Flashcards SM-2** — Repetição espaçada com algoritmo SuperMemo 2
- 🔄 **Reforço automático** — Errou? IA gera materiais de reforço instantaneamente
- 📊 **Dashboard com estatísticas** — Taxa de acerto, conquistas, flashcards pendentes
- ✏️ **Edição inline** — Renomeie materiais e assuntos sem sair da tela
- 📱 **100% responsivo** — Funciona em mobile, tablet e desktop

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| Frontend | React 18 + TypeScript | Interface e lógica do cliente |
| Build | Vite 5 | Bundler e servidor de dev |
| Estilização | Tailwind CSS + shadcn/ui | Design system responsivo |
| Autenticação | Firebase Auth | Login/cadastro com email+senha |
| Banco de Dados | Cloud Firestore | Memória persistente do agente |
| IA | Google Gemini 2.5 Flash | Geração de questões e feedback |
| Roteamento | React Router v6 | SPA com HashRouter |
| Hospedagem | GitHub Pages | Deploy estático |

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Projeto Firebase criado (Auth + Firestore habilitados)
- Chave da API Google Gemini (console.cloud.google.com)

### 1. Clone e instale
```bash
git clone https://github.com/SEU_USUARIO/EstudoInteligente.git
cd EstudoInteligente
npm install
```

### 2. Configure o ambiente
```bash
cp .env.example .env
# Edite .env com suas credenciais Firebase
```

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

### 3. Configure a chave do Gemini no Firestore
No console Firebase → Firestore → crie:
```
Coleção: configuracoes
  Documento: chaves
    Campo: gemini  (string) = SUA_CHAVE_GEMINI
```

> **Por que no Firestore?** A chave fica fora do bundle JavaScript — ela não pode ser extraída pelo navegador mesmo com devtools aberto.

### 4. Inicie
```bash
npm run dev
# Acesse http://localhost:8080
```

---

## 📁 Estrutura do Projeto

```
src/
├── pages/
│   ├── Login.tsx                    # Autenticação (email + senha)
│   ├── Dashboard.tsx                # Estatísticas, conquistas, ações rápidas
│   ├── Upload.tsx                   # Upload PDF/texto + IA mapeia assuntos
│   ├── Estudos.tsx                  # Lista de materiais do usuário
│   ├── EstudoMaterial.tsx           # Assuntos de um material (com rename inline)
│   ├── Estudo.tsx                   # Sessão de questões + IA adaptativa ← PRINCIPAL
│   ├── Flashcards.tsx               # Revisão SM-2 agrupada por assunto
│   ├── FlashcardsListaMaterial.tsx  # Visão panorâmica de todos os cards
│   └── ResultScreenEstudo.tsx       # Resultado + feedback da IA
│
├── components/
│   ├── QuestaoCard.tsx              # Card de questão (3 tipos, tesoura, reforço)
│   ├── AILoadingScreen.tsx          # Loading animado com 3 fases
│   ├── Navbar.tsx                   # Navegação responsiva (mobile + desktop)
│   ├── SmartFeedback.tsx            # Popup de feedback da IA
│   └── ui/                          # Componentes shadcn/ui
│
├── services/
│   ├── aiService.ts                 # ← AGENTE DE IA (5 funções Gemini)
│   ├── firebaseService.ts           # Operações Firestore com validações
│   └── firebaseConfig.ts            # Inicialização Firebase via .env
│
├── contexts/
│   └── AuthContext.tsx              # Estado global de autenticação
│
└── index.css                        # Animações CSS + design tokens
```

---

## 🗄️ Regras de Segurança do Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cada usuário acessa apenas seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /materiais/{docId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create:       if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    match /questoes/{docId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create:       if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    match /flashcards/{docId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create:       if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    match /historico_respostas/{docId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create:       if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    match /configuracoes/{docId} {
      allow read: if request.auth != null; // Chave Gemini: só leitura, só autenticados
    }
  }
}
```

---

## 📦 Build e Deploy

```bash
npm run build      # Gera pasta dist/
npm run preview    # Preview local do build
npm run deploy     # Deploy para GitHub Pages (requer gh-pages instalado)
```

---

## 📝 Licença

MIT — use, modifique e distribua livremente.