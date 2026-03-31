import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

let cachedApiKey: string | null = null;

async function getGeminiKey() {
  if (cachedApiKey) return cachedApiKey;

  const docSnap = await getDoc(doc(db, "configuracoes", "chaves"));
  if (docSnap.exists()) {
    cachedApiKey = docSnap.data().gemini;
    return cachedApiKey;
  }
  throw new Error("Chave Gemini não encontrada no banco de dados.");
}

async function chamarGemini(prompt: string, temperature = 0.4): Promise<string> {
  const apiKey = await getGeminiKey();
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      },
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || `Erro HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export interface Assunto {
  id: string;
  titulo: string;
  descricao: string;
  trecho: string;
}

export interface RespostaMapaAssuntos {
  tituloGeral: string;
  assuntos: Assunto[];
}

export interface QuestaoGerada {
  pergunta: string;
  alternativas: string[];
  correta: string;
  explicacao: string;
  tipo: "simples" | "elaborada";
}

export interface RespostaIA {
  resumo: string;
  questoes: QuestaoGerada[];
  flashcards: Array<{ frente: string; verso: string }>;
}

function extrairJSON(texto: string): string {
  let limpo = texto.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const inicioObj = limpo.indexOf("{");
  const fimObj = limpo.lastIndexOf("}");
  if (inicioObj !== -1 && fimObj !== -1) {
    limpo = limpo.substring(inicioObj, fimObj + 1);
  }
  limpo = limpo.replace(/,\s*([}\]])/g, "$1");
  limpo = limpo.replace(/,\s*""\s*}/g, "}");
  limpo = limpo.replace(/,\s*""\s*]/g, "]");
  return limpo;
}

function amostrarTexto(texto: string, maxChars = 20000): string {
  if (texto.length <= maxChars) return texto;
  const terco = Math.floor(maxChars / 3);
  const inicio = texto.substring(0, terco);
  const meioStart = Math.floor(texto.length / 2) - Math.floor(terco / 2);
  const meio = texto.substring(meioStart, meioStart + terco);
  const fimStart = texto.length - terco;
  const fim = texto.substring(fimStart);
  return `${inicio}\n\n[...]\n\n${meio}\n\n[...]\n\n${fim}`;
}

export const mapearAssuntos = async (
  texto: string,
  nomeArquivo?: string
): Promise<RespostaMapaAssuntos> => {
  const textoLimpo = texto.trim();
  const nomeBase = nomeArquivo?.replace(/\.(pdf|txt|docx?)$/i, "") || "Material de Estudo";
  const textoAmostrado = amostrarTexto(textoLimpo, 22000);

  const prompt = `Você é especialista pedagógico em concursos públicos brasileiros.

ARQUIVO: ${nomeBase}

MISSÃO: Identificar TODOS os tópicos/assuntos pedagógicos do material abaixo.

REGRAS:
- IGNORE: sumários, índices, apresentações, prefácios, notas editoriais, sobre o autor, informações de banca
- FOQUE em: conceitos, definições, regras, leis, teorias, classificações
- Identifique entre 3 e 8 assuntos principais
- Títulos ESPECÍFICOS: "Concordância Verbal", não "Gramática"
- Cada trecho deve ter ao menos 100 caracteres do texto original

Retorne APENAS JSON válido sem markdown:
{
  "tituloGeral": "Título representativo do material",
  "assuntos": [
    {
      "id": "assunto_1",
      "titulo": "Título específico",
      "descricao": "O que será estudado",
      "trecho": "Trecho do texto original (mínimo 100 caracteres)"
    }
  ]
}

TEXTO:
${textoAmostrado}`;

  try {
    const raw = await chamarGemini(prompt, 0.2);
    const json = extrairJSON(raw);
    const dados: RespostaMapaAssuntos = JSON.parse(json);

    if (!dados.tituloGeral || !Array.isArray(dados.assuntos) || dados.assuntos.length === 0) {
      throw new Error("Estrutura inválida");
    }

    const palavrasProibidas = [
      "apresentação", "prefácio", "sumário", "índice", "sobre o autor",
      "banca", "edital de referência", "como usar", "introdução ao material",
      "nota do autor", "nota editorial",
    ];
    const assuntosFiltrados = dados.assuntos.filter((a) => {
      const tituloLower = a.titulo.toLowerCase();
      return !palavrasProibidas.some((p) => tituloLower.includes(p));
    });

    return {
      tituloGeral: dados.tituloGeral,
      assuntos: (assuntosFiltrados.length > 0 ? assuntosFiltrados : dados.assuntos).map((a, i) => ({
        ...a,
        id: `assunto_${i + 1}`,
      })),
    };
  } catch (e) {
    console.error("Erro no mapeamento:", e);
    return {
      tituloGeral: nomeBase,
      assuntos: [
        {
          id: "assunto_1",
          titulo: nomeBase,
          descricao: "Conteúdo do material enviado",
          trecho: textoLimpo.substring(0, 3000),
        },
      ],
    };
  }
};

export const gerarConteudoParaAssunto = async (
  assunto: Assunto,
  tipoQuestao: "simples" | "elaborada" = "elaborada",
  quantidadeQuestoes = 5
): Promise<RespostaIA> => {
  const textoBase = assunto.trecho.trim();
  const usarConhecimentoIA = textoBase.length < 200;

  const fonteDados = usarConhecimentoIA
    ? `ASSUNTO: "${assunto.titulo}" — ${assunto.descricao}
Use seu conhecimento sobre este assunto para gerar questões de alto nível para concurso público.`
    : `CONTEÚDO DE REFERÊNCIA (NÃO mencione o material, apostila ou texto nas questões):
${textoBase.substring(0, 5000)}`;

  const promptFlash = `Você é elaborador de questões de memorização para concursos públicos brasileiros.

ASSUNTO: ${assunto.titulo}

${fonteDados}

OBJETIVO DO MODO FLASH:
Questões CURTAS e DIRETAS focadas em memorização de:
- Conceitos e definições objetivas
- Penas e punições (ex: "A pena para X é de Y anos")
- Datas e prazos legais
- Números, percentuais e limites
- Classificações e categorias
- Sinônimos técnicos e nomenclaturas

REGRAS OBRIGATÓRIAS:
1. Enunciados CURTOS — máximo 2 linhas, direto ao ponto
2. NÃO use situações-problema longas — foco em "O que é X?" / "Qual a pena de Y?" / "Em quanto tempo Z?"
3. Alternativas curtas — máximo 1 linha cada
4. NÃO mencione "o texto", "o material" ou "a apostila"
5. Velocidade: o aluno deve conseguir responder em menos de 20 segundos

FORMATO DA EXPLICAÇÃO (obrigatório, use exatamente este template):
✅ CORRETA [LETRA]: [motivo direto e objetivo]
❌ [LETRA]: [por que está errada — em uma linha]
❌ [LETRA]: [por que está errada — em uma linha]
❌ [LETRA]: [por que está errada — em uma linha]
❌ [LETRA]: [por que está errada — em uma linha]
📌 Conceito-chave: [regra ou definição para memorizar]
💡 Dica: [mnemônico, associação ou pegadinha comum]

Gere exatamente ${quantidadeQuestoes} questões com 5 alternativas (A, B, C, D, E) e ${quantidadeQuestoes} flashcards CONCISOS.

Retorne APENAS JSON puro válido sem markdown:
{
  "resumo": "Síntese dos pontos-chave para memorização",
  "questoes": [
    {
      "pergunta": "Enunciado curto e direto (máx 2 linhas)",
      "alternativas": ["A) resposta curta", "B) resposta curta", "C) resposta curta", "D) resposta curta", "E) resposta curta"],
      "correta": "A) texto exato da alternativa correta",
      "explicacao": "✅ CORRETA A: motivo direto\\n❌ B: motivo\\n❌ C: motivo\\n❌ D: motivo\\n❌ E: motivo\\n📌 Conceito-chave: definição\\n💡 Dica: mnemônico",
      "tipo": "simples"
    }
  ],
  "flashcards": [
    {
      "frente": "Pergunta curta e objetiva",
      "verso": "Resposta direta (máx 2 linhas)"
    }
  ]
}`;

  const promptConcurso = `Você é elaborador sênior de provas de concursos públicos brasileiros (CESPE/CEBRASPE, FCC, VUNESP, FGV).

ASSUNTO: ${assunto.titulo}
NÍVEL: Concurso público de nível médio/superior

${fonteDados}

INSTRUÇÕES PARA AS QUESTÕES:
1. NUNCA mencione "o texto", "o material", "a apostila" — questões devem ser AUTOSSUFICIENTES
2. Crie situações-problema reais e casos concretos
3. Use linguagem técnica precisa como nas bancas reais
4. Alternativas incorretas devem ter erros sutis e plausíveis
5. Varie verbos: analise, julgue, identifique, assinale, é correto afirmar...

FORMATO DA EXPLICAÇÃO (obrigatório, use exatamente este template):
✅ CORRETA [LETRA]: [motivo detalhado de por que está correta]
❌ [LETRA]: [por que esta alternativa está errada — erro técnico específico]
❌ [LETRA]: [por que esta alternativa está errada]
❌ [LETRA]: [por que esta alternativa está errada]
❌ [LETRA]: [por que esta alternativa está errada]
📌 Conceito-chave: [regra, lei ou fundamento técnico]
💡 Dica Prova: [estratégia de memorização ou pegadinha recorrente]

Gere exatamente ${quantidadeQuestoes} questões com 5 alternativas (A, B, C, D, E) e ${quantidadeQuestoes} flashcards CONCISOS.

Retorne APENAS JSON puro válido sem markdown:
{
  "resumo": "Síntese dos pontos principais em 2-3 frases",
  "questoes": [
    {
      "pergunta": "Enunciado completo e autossuficiente com situação-problema",
      "alternativas": ["A) texto completo", "B) texto completo", "C) texto completo", "D) texto completo", "E) texto completo"],
      "correta": "A) texto exato da alternativa correta",
      "explicacao": "✅ CORRETA A: motivo detalhado\\n❌ B: motivo\\n❌ C: motivo\\n❌ D: motivo\\n❌ E: motivo\\n📌 Conceito-chave: fundamento\\n💡 Dica Prova: estratégia",
      "tipo": "elaborada"
    }
  ],
  "flashcards": [
    {
      "frente": "Pergunta curta e objetiva sobre ${assunto.titulo}",
      "verso": "Resposta direta e objetiva (máx 2 linhas)"
    }
  ]
}`;

  const promptEscolhido = tipoQuestao === "simples" ? promptFlash : promptConcurso;

  try {
    const raw = await chamarGemini(promptEscolhido, 0.6);
    const json = extrairJSON(raw);
    const dados: RespostaIA = JSON.parse(json);

    if (!dados.questoes || dados.questoes.length === 0) {
      throw new Error("Nenhuma questão gerada");
    }

    return dados;
  } catch (e) {
    console.error("Erro ao gerar conteúdo:", e);

    try {
      const promptFallback = tipoQuestao === "simples"
        ? `Elabore ${quantidadeQuestoes} questões de memorização sobre "${assunto.titulo}" — curtas, sobre definições, penas, datas, números. Enunciados de no máximo 2 linhas.
Explicação formato: ✅ CORRETA X: motivo\\n❌ Y: motivo\\n📌 Conceito: definição\\n💡 Dica: mnemônico

JSON APENAS:
{"resumo":"pontos-chave","questoes":[{"pergunta":"Qual é X?","alternativas":["A) op1","B) op2","C) op3","D) op4","E) op5"],"correta":"A) op1","explicacao":"✅ CORRETA A: motivo\\n❌ B: motivo\\n📌 Conceito: definição\\n💡 Dica: mnemônico","tipo":"simples"}],"flashcards":[{"frente":"pergunta curta","verso":"resposta direta"}]}`
        : `Elabore ${quantidadeQuestoes} questões de concurso público estilo CESPE sobre "${assunto.titulo}" com situações-problema.
Explicação: ✅ CORRETA X: motivo\\n❌ Y: motivo\\n📌 Conceito: fundamento\\n💡 Dica: estratégia

JSON APENAS:
{"resumo":"síntese","questoes":[{"pergunta":"Assinale a alternativa correta sobre X:","alternativas":["A) op1","B) op2","C) op3","D) op4","E) op5"],"correta":"A) op1","explicacao":"✅ CORRETA A: motivo\\n❌ B: motivo\\n📌 Conceito: fundamento\\n💡 Dica Prova: estratégia","tipo":"elaborada"}],"flashcards":[{"frente":"pergunta curta","verso":"resposta direta"}]}`;

      const raw2 = await chamarGemini(promptFallback, 0.5);
      const json2 = extrairJSON(raw2);
      const dados2: RespostaIA = JSON.parse(json2);
      if (dados2.questoes?.length > 0) return dados2;
    } catch {
      // fallback final silencioso
    }

    return { resumo: "Não foi possível gerar no momento.", questoes: [], flashcards: [] };
  }
};

export const gerarReforcoParaQuestao = async (
  perguntaOriginal: string,
  assunto: string
): Promise<RespostaIA> => {
  const prompt = `Você é professor de concursos públicos especialista em reforço de aprendizagem.

O aluno precisa de reforço sobre "${assunto}". Questão de referência:
"${perguntaOriginal}"

Gere 3 questões de reforço sobre este mesmo conceito (ângulos diferentes) e 3 flashcards CONCISOS.
Questões autossuficientes — NÃO mencione o material ou texto.

FORMATO DA EXPLICAÇÃO (obrigatório):
✅ CORRETA [LETRA]: motivo direto
❌ [LETRA]: por que está errada
❌ [LETRA]: por que está errada
❌ [LETRA]: por que está errada
❌ [LETRA]: por que está errada
📌 Conceito-chave: fundamento técnico
💡 Dica: mnemônico ou estratégia

JSON APENAS:
{
  "resumo": "Reforço importante. Estude mais questões para fixar o conceito.",
  "questoes": [
    {
      "pergunta": "Questão de reforço autossuficiente",
      "alternativas": ["A) texto", "B) texto", "C) texto", "D) texto", "E) texto"],
      "correta": "A) texto exato",
      "explicacao": "✅ CORRETA A: motivo\\n❌ B: motivo\\n❌ C: motivo\\n❌ D: motivo\\n❌ E: motivo\\n📌 Conceito-chave: fundamento\\n💡 Dica: mnemônico",
      "tipo": "elaborada"
    }
  ],
  "flashcards": [
    {
      "frente": "Pergunta curta sobre ${assunto}",
      "verso": "Resposta direta (máx 2 linhas)"
    }
  ]
}`;

  try {
    const raw = await chamarGemini(prompt, 0.6);
    const json = extrairJSON(raw);
    return JSON.parse(json);
  } catch {
    return { resumo: "Erro ao gerar reforço", questoes: [], flashcards: [] };
  }
};

export const gerarFeedbackDesempenho = async (
  taxaAcerto: number,
  temasErrados: string[]
): Promise<string> => {
  const prompt = `Tutor sênior de concursos públicos. O aluno obteve ${taxaAcerto}% de acerto.
${temasErrados.length > 0 ? `Pontos fracos: ${temasErrados.slice(0, 3).join(", ")}.` : "Desempenho excelente."}
Feedback motivador, estratégico e direto em no máximo 2 frases. Seja prático e encorajador.`;

  try {
    return await chamarGemini(prompt, 0.8);
  } catch {
    return "Continue praticando! A consistência diária é o diferencial para a aprovação.";
  }
};