import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

// ============================================================
// CHAVE DA API — lida do Firestore, nunca do bundle
// ============================================================
let cachedApiKey: string | null = null;

async function getGeminiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  try {
    const docSnap = await getDoc(doc(db, "configuracoes", "chaves"));
    if (docSnap.exists() && docSnap.data().gemini) {
      cachedApiKey = docSnap.data().gemini as string;
      return cachedApiKey;
    }
    throw new Error(
      "Campo 'gemini' não encontrado. Vá ao Firestore > configuracoes > chaves e adicione o campo gemini com sua chave."
    );
  } catch (e) {
    throw new Error(`Erro ao carregar chave da API: ${e}`);
  }
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
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 400 || response.status === 403) {
      cachedApiKey = null;
    }
    throw new Error(err?.error?.message || `Erro HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ============================================================
// TIPOS
// ============================================================
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

// ============================================================
// PARSER DE JSON ROBUSTO
// ============================================================

function sanitizarStringsJSON(json: string): string {
  let resultado = "";
  let dentroString = false;
  let escape = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    const code = json.charCodeAt(i);

    if (escape) {
      resultado += char;
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      resultado += char;
      continue;
    }

    if (char === '"') {
      dentroString = !dentroString;
      resultado += char;
      continue;
    }

    if (dentroString) {
      if (char === "\n") {
        resultado += "\\n";
      } else if (char === "\r") {
        resultado += "\\r";
      } else if (char === "\t") {
        resultado += "\\t";
      } else if (code < 0x20) {
        // Caractere de controle inválido: descarta
      } else {
        resultado += char;
      }
    } else {
      resultado += char;
    }
  }

  return resultado;
}

function extrairJSON(texto: string): string {
  let limpo = texto
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const inicioObj = limpo.indexOf("{");
  const fimObj = limpo.lastIndexOf("}");
  if (inicioObj !== -1 && fimObj !== -1) {
    limpo = limpo.substring(inicioObj, fimObj + 1);
  }

  limpo = limpo
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  limpo = limpo.replace(/,\s*([}\]])/g, "$1");
  limpo = limpo.replace(/,\s*""\s*}/g, "}");
  limpo = limpo.replace(/,\s*""\s*]/g, "]");
  limpo = sanitizarStringsJSON(limpo);

  return limpo;
}

// ============================================================
// UTILITÁRIOS DE TEXTO
// ============================================================
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

function extrairTrechoLocal(
  textoOriginal: string,
  titulo: string,
  descricao: string,
  minChars = 150,
  maxChars = 800
): string {
  const palavrasChave = [...titulo.split(/\s+/), ...descricao.split(/\s+/)]
    .map((p) => p.toLowerCase().replace(/[^a-záàãâéêíóôõúüç]/gi, ""))
    .filter((p) => p.length > 3);

  const paragrafos = textoOriginal
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= minChars);

  let melhor = "";
  let melhorPontos = -1;

  for (const paragrafo of paragrafos) {
    const lower = paragrafo.toLowerCase();
    const pontos = palavrasChave.reduce(
      (acc, kw) => acc + (lower.includes(kw) ? 1 : 0),
      0
    );
    if (pontos > melhorPontos) {
      melhorPontos = pontos;
      melhor = paragrafo;
    }
  }

  if (!melhor && paragrafos.length > 0) melhor = paragrafos[0];
  if (!melhor) melhor = textoOriginal.substring(0, maxChars);

  return melhor.substring(0, maxChars);
}

// ============================================================
// MAPEAMENTO DE ASSUNTOS
// ============================================================

export const mapearAssuntos = async (
  texto: string,
  nomeArquivo?: string
): Promise<RespostaMapaAssuntos> => {
  const textoLimpo = texto.trim();
  const nomeBase =
    nomeArquivo?.replace(/\.(pdf|txt|docx?)$/i, "") || "Material de Estudo";
  const textoAmostrado = amostrarTexto(textoLimpo, 22000);

  const prompt = `Você é especialista pedagógico em concursos públicos brasileiros.

ARQUIVO: ${nomeBase}

MISSÃO: Identificar os tópicos pedagógicos do material abaixo.

REGRAS:
- IGNORE: sumários, índices, apresentações, prefácios, notas editoriais, sobre o autor
- FOQUE em: conceitos, definições, regras, leis, teorias, classificações
- Identifique entre 3 e 8 assuntos principais
- Títulos ESPECÍFICOS (ex: "Concordância Verbal", não "Gramática")

FORMATO DE SAÍDA — retorne SOMENTE este JSON, sem markdown, sem texto antes ou depois:
{
  "tituloGeral": "Título representativo do material",
  "assuntos": [
    {
      "id": "assunto_1",
      "titulo": "Título específico do tópico",
      "descricao": "Uma frase curta descrevendo o que será estudado"
    }
  ]
}

REGRAS DO JSON:
- Strings curtas, sem quebras de linha
- Sem aspas dentro dos valores
- Sem markdown, sem blocos de código

TEXTO:
${textoAmostrado}`;

  try {
    const raw = await chamarGemini(prompt, 0.2);
    const json = extrairJSON(raw);

    const dados = JSON.parse(json) as {
      tituloGeral: string;
      assuntos: Array<{ id: string; titulo: string; descricao: string }>;
    };

    if (
      !dados.tituloGeral ||
      !Array.isArray(dados.assuntos) ||
      dados.assuntos.length === 0
    ) {
      throw new Error("Estrutura inválida");
    }

    const palavrasProibidas = [
      "apresentação", "prefácio", "sumário", "índice", "sobre o autor",
      "banca", "edital de referência", "como usar", "introdução ao material",
      "nota do autor", "nota editorial",
    ];

    const assuntosFiltrados = dados.assuntos.filter((a) => {
      const lower = a.titulo.toLowerCase();
      return !palavrasProibidas.some((p) => lower.includes(p));
    });

    const listaFinal =
      assuntosFiltrados.length > 0 ? assuntosFiltrados : dados.assuntos;

    return {
      tituloGeral: dados.tituloGeral,
      assuntos: listaFinal.map((a, i) => ({
        id: `assunto_${i + 1}`,
        titulo: a.titulo,
        descricao: a.descricao,
        trecho: extrairTrechoLocal(textoLimpo, a.titulo, a.descricao),
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
          descricao: "Conteúdo completo do material enviado",
          trecho: textoLimpo.substring(0, 800),
        },
      ],
    };
  }
};

// ============================================================
// GERAÇÃO DE CONTEÚDO — QUESTÕES E FLASHCARDS
// ============================================================

export const gerarConteudoParaAssunto = async (
  assunto: Assunto,
  tipoQuestao: "simples" | "elaborada" = "elaborada",
  quantidadeQuestoes = 5,
  errosRecentes?: string[] // perguntas que o aluno errou para geração adaptativa
): Promise<RespostaIA> => {
  const textoBase = assunto.trecho.trim();
  const usarConhecimentoIA = textoBase.length < 200;

  const fonteDados = usarConhecimentoIA
    ? `ASSUNTO: ${assunto.titulo} — ${assunto.descricao}
Use seu conhecimento sobre este assunto para gerar questões de alto nível para concurso público.`
    : `CONTEÚDO DE REFERÊNCIA (NÃO mencione o material, apostila ou texto nas questões):
${textoBase.substring(0, 5000)}`;

  const contextoAdaptativo = errosRecentes && errosRecentes.length > 0
    ? `\nFOCO ADAPTATIVO: O aluno errou questões sobre os seguintes pontos — gere questões que reforcem esses temas:
${errosRecentes.slice(0, 3).map((e, i) => `${i + 1}. ${e.substring(0, 120)}`).join("\n")}\n`
    : "";

  const regraJSON = `REGRAS CRÍTICAS DE FORMATO JSON:
- Retorne APENAS JSON puro, sem markdown, sem blocos de código
- Use \\n para separar linhas na explicacao — NUNCA quebre linha real dentro de uma string
- Não use aspas duplas dentro dos valores de string — reescreva sem elas
- Cada string deve estar em uma única linha`;

  // Distribuição de tipos de questão para tornar a prova mais variada
  // Para modo concurso: ~40% múltipla escolha, ~30% certo/errado, ~30% associação (I II III IV)
  // Para modo flash: ~60% múltipla escolha, ~40% certo/errado
  const instrucoesTipos = tipoQuestao === "elaborada"
    ? `VARIEDADE DE TIPOS — distribua as ${quantidadeQuestoes} questões assim:
- ${Math.ceil(quantidadeQuestoes * 0.4)} questões de múltipla escolha clássica (5 alternativas A-E)
- ${Math.floor(quantidadeQuestoes * 0.3)} questões de Certo/Errado (2 alternativas: "A) Certo" e "B) Errado")
- ${Math.floor(quantidadeQuestoes * 0.3)} questões de Associação/Julgamento com itens I, II, III, IV no enunciado e alternativas como "A) Apenas I e II" / "B) Apenas III" / etc.

Para questões de Associação, formato do enunciado:
"Sobre [tema], julgue os itens abaixo:\\nI. Afirmativa correta ou incorreta.\\nII. Afirmativa correta ou incorreta.\\nIII. Afirmativa correta ou incorreta.\\nIV. Afirmativa correta ou incorreta.\\nEstão CORRETOS apenas:"
E as alternativas devem ser combinações como:
"A) I e II", "B) I, II e III", "C) II e IV", "D) Apenas III", "E) Todos estão corretos"`
    : `VARIEDADE DE TIPOS — distribua as ${quantidadeQuestoes} questões assim:
- ${Math.ceil(quantidadeQuestoes * 0.6)} questões de múltipla escolha (5 alternativas A-E, respostas curtas)
- ${Math.floor(quantidadeQuestoes * 0.4)} questões de Certo/Errado (2 alternativas: "A) Certo" e "B) Errado")`;

  // ── MODO FLASH ──
  const promptFlash = `Você é elaborador de questões de memorização para concursos públicos brasileiros.

ASSUNTO: ${assunto.titulo}

${fonteDados}
${contextoAdaptativo}
OBJETIVO: Questões CURTAS e DIRETAS sobre conceitos, penas, datas, números, classificações.

REGRAS:
1. Enunciados máximo 2 linhas
2. Alternativas curtas — máximo 1 linha cada
3. NÃO mencione o texto ou material
4. Resposta em menos de 20 segundos

${instrucoesTipos}

${regraJSON}

Gere exatamente ${quantidadeQuestoes} questões e ${quantidadeQuestoes} flashcards.

{"resumo":"Síntese dos pontos-chave","questoes":[{"pergunta":"Enunciado curto","alternativas":["A) op1","B) op2","C) op3","D) op4","E) op5"],"correta":"A) op1","explicacao":"✅ CORRETA A: motivo\\n❌ B: motivo\\n❌ C: motivo\\n❌ D: motivo\\n❌ E: motivo\\n📌 Conceito-chave: definicao\\n💡 Dica: mneumonico","tipo":"simples"}],"flashcards":[{"frente":"Pergunta curta","verso":"Resposta direta"}]}`;

  // ── MODO CONCURSO ──
  const promptConcurso = `Você é elaborador sênior de provas de concursos públicos brasileiros (CESPE, FCC, VUNESP, FGV).

ASSUNTO: ${assunto.titulo}

${fonteDados}
${contextoAdaptativo}
INSTRUÇÕES:
1. NUNCA mencione o texto ou material — questões autossuficientes
2. Situações-problema reais e casos concretos
3. Linguagem técnica precisa
4. Alternativas incorretas com erros sutis
5. Varie verbos: analise, julgue, identifique, assinale

${instrucoesTipos}

${regraJSON}

Gere exatamente ${quantidadeQuestoes} questões e ${quantidadeQuestoes} flashcards.

{"resumo":"Síntese dos pontos principais","questoes":[{"pergunta":"Enunciado completo com situação-problema","alternativas":["A) texto","B) texto","C) texto","D) texto","E) texto"],"correta":"A) texto exato","explicacao":"✅ CORRETA A: motivo detalhado\\n❌ B: motivo\\n❌ C: motivo\\n❌ D: motivo\\n❌ E: motivo\\n📌 Conceito-chave: fundamento\\n💡 Dica Prova: estrategia","tipo":"elaborada"}],"flashcards":[{"frente":"Pergunta objetiva","verso":"Resposta direta"}]}`;

  const promptEscolhido =
    tipoQuestao === "simples" ? promptFlash : promptConcurso;

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
      const promptFallback =
        tipoQuestao === "simples"
          ? `Elabore ${quantidadeQuestoes} questoes curtas de memorização sobre ${assunto.titulo}. Use \\n na explicacao. Sem aspas nos valores. JSON puro: {"resumo":"pontos","questoes":[{"pergunta":"Qual e X?","alternativas":["A) op1","B) op2","C) op3","D) op4","E) op5"],"correta":"A) op1","explicacao":"✅ CORRETA A: motivo\\n❌ B: motivo\\n📌 Conceito: definicao\\n💡 Dica: dica","tipo":"simples"}],"flashcards":[{"frente":"pergunta","verso":"resposta"}]}`
          : `Elabore ${quantidadeQuestoes} questoes de concurso sobre ${assunto.titulo}. Use \\n na explicacao. Sem aspas nos valores. JSON puro: {"resumo":"sintese","questoes":[{"pergunta":"Assinale sobre X:","alternativas":["A) op1","B) op2","C) op3","D) op4","E) op5"],"correta":"A) op1","explicacao":"✅ CORRETA A: motivo\\n❌ B: motivo\\n📌 Conceito: fundamento\\n💡 Dica Prova: estrategia","tipo":"elaborada"}],"flashcards":[{"frente":"pergunta","verso":"resposta"}]}`;

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

// ============================================================
// REFORÇO
// ============================================================

export const gerarReforcoParaQuestao = async (
  perguntaOriginal: string,
  assunto: string
): Promise<RespostaIA> => {
  const prompt = `Você é professor de concursos públicos especialista em reforço de aprendizagem.

Aluno precisa de reforço sobre ${assunto}. Questão de referência: ${perguntaOriginal}

Gere 3 questões de reforço (ângulos diferentes) e 3 flashcards CONCISOS.
Questões autossuficientes — NÃO mencione material ou texto.

REGRAS DE JSON:
- APENAS JSON puro, sem markdown
- Use \\n para separar linhas na explicacao — NUNCA quebre linha real
- Sem aspas dentro dos valores

{"resumo":"Reforço importante. Estude mais para fixar o conceito.","questoes":[{"pergunta":"Questão de reforço","alternativas":["A) texto","B) texto","C) texto","D) texto","E) texto"],"correta":"A) texto exato","explicacao":"✅ CORRETA A: motivo\\n❌ B: motivo\\n❌ C: motivo\\n❌ D: motivo\\n❌ E: motivo\\n📌 Conceito-chave: fundamento\\n💡 Dica: mneumonico","tipo":"elaborada"}],"flashcards":[{"frente":"Pergunta curta sobre ${assunto}","verso":"Resposta direta"}]}`;

  try {
    const raw = await chamarGemini(prompt, 0.6);
    const json = extrairJSON(raw);
    return JSON.parse(json);
  } catch {
    return { resumo: "Erro ao gerar reforço", questoes: [], flashcards: [] };
  }
};

// ============================================================
// FEEDBACK DE DESEMPENHO
// ============================================================

export const gerarFeedbackDesempenho = async (
  taxaAcerto: number,
  temasErrados: string[]
): Promise<string> => {
  const prompt = `Tutor sênior de concursos públicos. O aluno obteve ${taxaAcerto}% de acerto.
${
  temasErrados.length > 0
    ? `Pontos fracos: ${temasErrados.slice(0, 3).join(", ")}.`
    : "Desempenho excelente."
}
Feedback motivador, estratégico e direto em no máximo 2 frases.`;

  try {
    return await chamarGemini(prompt, 0.8);
  } catch {
    return "Continue praticando! A consistência diária é o diferencial para a aprovação.";
  }
};