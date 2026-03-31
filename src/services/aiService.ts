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
      generationConfig: { temperature, maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 400 || response.status === 403) cachedApiKey = null;
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

    if (escape) { resultado += char; escape = false; continue; }
    if (char === "\\") { escape = true; resultado += char; continue; }
    if (char === '"') { dentroString = !dentroString; resultado += char; continue; }

    if (dentroString) {
      if (char === "\n") resultado += "\\n";
      else if (char === "\r") resultado += "\\r";
      else if (char === "\t") resultado += "\\t";
      else if (code < 0x20) { /* descarta */ }
      else resultado += char;
    } else {
      resultado += char;
    }
  }
  return resultado;
}

function extrairJSON(texto: string): string {
  let limpo = texto.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

  const inicioObj = limpo.indexOf("{");
  const fimObj = limpo.lastIndexOf("}");
  if (inicioObj !== -1 && fimObj !== -1) limpo = limpo.substring(inicioObj, fimObj + 1);

  limpo = limpo.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
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

function extrairTrechoLocal(textoOriginal: string, titulo: string, descricao: string, minChars = 150, maxChars = 800): string {
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
    const pontos = palavrasChave.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (pontos > melhorPontos) { melhorPontos = pontos; melhor = paragrafo; }
  }

  if (!melhor && paragrafos.length > 0) melhor = paragrafos[0];
  if (!melhor) melhor = textoOriginal.substring(0, maxChars);
  return melhor.substring(0, maxChars);
}

// ============================================================
// DISTRIBUIÇÃO DINÂMICA DE TIPOS DE QUESTÃO
// ============================================================
type TipoDistribuicao = "multipla" | "certo_errado" | "associacao";

function gerarDistribuicaoTipos(quantidade: number, modo: "simples" | "elaborada"): TipoDistribuicao[] {
  const pesos: Record<TipoDistribuicao, number> = modo === "elaborada"
    ? { multipla: 2, certo_errado: 2, associacao: 2 }
    : { multipla: 3, certo_errado: 2, associacao: 1 };

  const pool: TipoDistribuicao[] = [];
  for (const tipo of Object.keys(pesos) as TipoDistribuicao[]) {
    for (let i = 0; i < pesos[tipo]; i++) pool.push(tipo);
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const resultado: TipoDistribuicao[] = [];
  for (let i = 0; i < quantidade; i++) resultado.push(pool[i % pool.length]);

  for (let i = resultado.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }

  return resultado;
}

function descreverDistribuicao(tipos: TipoDistribuicao[]): string {
  const contagem: Record<TipoDistribuicao, number> = { multipla: 0, certo_errado: 0, associacao: 0 };
  tipos.forEach((t) => contagem[t]++);
  const partes: string[] = [];
  if (contagem.multipla > 0) partes.push(`${contagem.multipla} de Múltipla Escolha (5 alternativas A-E)`);
  if (contagem.certo_errado > 0) partes.push(`${contagem.certo_errado} de Certo/Errado (alternativas: "A) Certo" e "B) Errado")`);
  if (contagem.associacao > 0) partes.push(`${contagem.associacao} de Associação/Julgamento (itens I, II, III, IV no enunciado)`);
  return partes.join(", ");
}

// ============================================================
// LIMPEZA DE FLASHCARDS
// ============================================================
function limparFlashcardsGerados(flashcards: Array<{ frente: string; verso: string }>): Array<{ frente: string; verso: string }> {
  return flashcards
    .filter((fc) => fc.frente && fc.verso)
    .map((fc) => ({
      // Limpa frente: remove prefixos de alternativa, gabarito comentado
      frente: fc.frente
        .replace(/^[A-E]\)\s*/i, "")
        .replace(/✅|❌|📌|💡/g, "")
        .replace(/CORRETA?\s*[A-E]\)?\s*:?/gi, "")
        .replace(/^(Conceito|Definição|Pergunta|Questão):\s*/i, "")
        .trim(),
      // Limpa verso: remove listas de alternativas, gabarito comentado
      verso: fc.verso
        .replace(/[A-E]\)\s+[^\n]+/g, "")   // remove "A) texto B) texto"
        .replace(/✅.*$/gm, "")              // remove linhas de gabarito
        .replace(/❌.*$/gm, "")
        .replace(/📌.*$/gm, "")
        .replace(/💡.*$/gm, "")
        .replace(/CORRETA?\s*[A-E]\)?\s*:?[^\n]*/gi, "")
        .replace(/Alternativas?:?[^\n]*/gi, "")
        .replace(/\n{2,}/g, "\n")
        .trim(),
    }))
    .filter((fc) => fc.frente.length > 5 && fc.verso.length > 5);
}

// ============================================================
// MAPEAMENTO DE ASSUNTOS
// ============================================================
export const mapearAssuntos = async (texto: string, nomeArquivo?: string): Promise<RespostaMapaAssuntos> => {
  const textoLimpo = texto.trim();
  const nomeBase = nomeArquivo?.replace(/\.(pdf|txt|docx?)$/i, "") || "Material de Estudo";
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
    const dados = JSON.parse(json) as { tituloGeral: string; assuntos: Array<{ id: string; titulo: string; descricao: string }> };

    if (!dados.tituloGeral || !Array.isArray(dados.assuntos) || dados.assuntos.length === 0)
      throw new Error("Estrutura inválida");

    const palavrasProibidas = ["apresentação", "prefácio", "sumário", "índice", "sobre o autor", "banca", "edital de referência", "como usar", "introdução ao material", "nota do autor", "nota editorial"];
    const assuntosFiltrados = dados.assuntos.filter((a) => {
      const lower = a.titulo.toLowerCase();
      return !palavrasProibidas.some((p) => lower.includes(p));
    });
    const listaFinal = assuntosFiltrados.length > 0 ? assuntosFiltrados : dados.assuntos;

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
      assuntos: [{ id: "assunto_1", titulo: nomeBase, descricao: "Conteúdo completo do material enviado", trecho: textoLimpo.substring(0, 800) }],
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
  errosRecentes?: string[]
): Promise<RespostaIA> => {
  const textoBase = assunto.trecho.trim();
  const usarConhecimentoIA = textoBase.length < 200;

  const fonteDados = usarConhecimentoIA
    ? `ASSUNTO: ${assunto.titulo} — ${assunto.descricao}\nUse seu conhecimento sobre este assunto para gerar questões de alto nível para concurso público.`
    : `CONTEÚDO DE REFERÊNCIA (NÃO mencione o material, apostila ou texto nas questões):\n${textoBase.substring(0, 5000)}`;

  const contextoAdaptativo = errosRecentes && errosRecentes.length > 0
    ? `\nFOCO ADAPTATIVO: O aluno errou questões sobre os seguintes pontos — gere questões que reforcem esses temas:\n${errosRecentes.slice(0, 3).map((e, i) => `${i + 1}. ${e.substring(0, 120)}`).join("\n")}\n`
    : "";

  const distribuicao = gerarDistribuicaoTipos(quantidadeQuestoes, tipoQuestao);
  const descricaoDistribuicao = descreverDistribuicao(distribuicao);

  const regraJSON = `REGRAS CRÍTICAS DE FORMATO JSON:
- Retorne APENAS JSON puro, sem markdown, sem blocos de código
- Use \\n para separar itens I, II, III no enunciado de associação — NUNCA quebre linha real dentro de uma string
- Não use aspas duplas dentro dos valores de string — reescreva sem elas
- Cada string deve estar em uma única linha`;

  const instrucoesPorTipo = `TIPOS DESTA RODADA — gere EXATAMENTE nesta distribuição: ${descricaoDistribuicao}

FORMATO DE CADA TIPO:

▸ MÚLTIPLA ESCOLHA:
  - 5 alternativas (A a E), cada uma começando com "A) ", "B) ", etc.
  - Uma única resposta correta

▸ CERTO/ERRADO:
  - Exatamente 2 alternativas: "A) Certo" e "B) Errado"
  - O enunciado afirma algo que é verdadeiro ou falso
  - "correta" deve ser "A) Certo" ou "B) Errado"

▸ ASSOCIAÇÃO/JULGAMENTO:
  - O enunciado deve conter os itens I, II, III (e IV se couber), separados por \\n
  - Formato obrigatório do campo "pergunta":
    "Sobre [tema], julgue os itens a seguir:\\nI. [afirmativa]\\nII. [afirmativa]\\nIII. [afirmativa]\\nEstão CORRETOS apenas:"
  - 5 alternativas com combinações dos itens:
    "A) Apenas I", "B) I e II", "C) II e III", "D) Apenas III", "E) Todos estão corretos"
  - "correta" deve ser a alternativa exata (ex: "B) I e II")`;

  // FLASHCARDS — padrão conceito/definição
  const instrucaoFlashcards = `FLASHCARDS — REGRAS OBRIGATÓRIAS (MUITO IMPORTANTE):
- São cartões de MEMORIZAÇÃO. NÃO são questões.
- NUNCA copie enunciados de questões.
- NUNCA coloque alternativas (A), B), C)...) nos flashcards.
- NUNCA coloque gabarito comentado (✅ ❌ 📌 💡) nos flashcards.
- PADRÃO OBRIGATÓRIO: use o modelo CONCEITO ↔ DEFINIÇÃO:
  * "frente": nome do conceito, termo técnico ou pergunta direta (máx 10 palavras). Ex: "O que é habeas corpus?"
  * "verso": definição objetiva, resposta direta (máx 20 palavras). Ex: "Remédio constitucional que protege a liberdade de locomoção ilegal ou abusiva."
- Varie os formatos: definição→conceito, conceito→definição, causa→efeito, lei→conteúdo
- Cada flashcard = 1 único conceito. Sem listas. Sem parágrafos.`;

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

${instrucoesPorTipo}

${instrucaoFlashcards}

${regraJSON}

Gere exatamente ${quantidadeQuestoes} questões e ${quantidadeQuestoes} flashcards.

{"resumo":"Síntese dos pontos-chave","questoes":[{"pergunta":"Enunciado curto","alternativas":["A) op1","B) op2","C) op3","D) op4","E) op5"],"correta":"A) op1","explicacao":"✅ CORRETA A: motivo\\n❌ B: motivo\\n❌ C: motivo\\n❌ D: motivo\\n❌ E: motivo\\n📌 Conceito-chave: definicao\\n💡 Dica: mneumonico","tipo":"simples"}],"flashcards":[{"frente":"O que é X?","verso":"X é a definição direta e objetiva do conceito"}]}`;

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

${instrucoesPorTipo}

${instrucaoFlashcards}

${regraJSON}

Gere exatamente ${quantidadeQuestoes} questões e ${quantidadeQuestoes} flashcards.

{"resumo":"Síntese dos pontos principais","questoes":[{"pergunta":"Enunciado completo","alternativas":["A) texto","B) texto","C) texto","D) texto","E) texto"],"correta":"A) texto exato","explicacao":"✅ CORRETA A: motivo detalhado\\n❌ B: motivo\\n❌ C: motivo\\n❌ D: motivo\\n❌ E: motivo\\n📌 Conceito-chave: fundamento\\n💡 Dica Prova: estrategia","tipo":"elaborada"}],"flashcards":[{"frente":"O que é X?","verso":"X é a definição direta e objetiva do conceito"}]}`;

  const promptEscolhido = tipoQuestao === "simples" ? promptFlash : promptConcurso;

  try {
    const raw = await chamarGemini(promptEscolhido, 0.65);
    const json = extrairJSON(raw);
    const dados: RespostaIA = JSON.parse(json);

    if (!dados.questoes || dados.questoes.length === 0) throw new Error("Nenhuma questão gerada");

    // Limpa flashcards
    if (dados.flashcards) dados.flashcards = limparFlashcardsGerados(dados.flashcards);

    return dados;
  } catch (e) {
    console.error("Erro ao gerar conteúdo:", e);
    try {
      const promptFallback = tipoQuestao === "simples"
        ? `Elabore ${quantidadeQuestoes} questoes curtas sobre ${assunto.titulo}. JSON puro: {"resumo":"pontos","questoes":[{"pergunta":"Qual e X?","alternativas":["A) op1","B) op2","C) op3","D) op4","E) op5"],"correta":"A) op1","explicacao":"✅ CORRETA A: motivo\\n❌ B: motivo\\n📌 Conceito: definicao\\n💡 Dica: dica","tipo":"simples"}],"flashcards":[{"frente":"O que e X?","verso":"X e a definicao direta"}]}`
        : `Elabore ${quantidadeQuestoes} questoes de concurso sobre ${assunto.titulo}. JSON puro: {"resumo":"sintese","questoes":[{"pergunta":"Assinale sobre X:","alternativas":["A) op1","B) op2","C) op3","D) op4","E) op5"],"correta":"A) op1","explicacao":"✅ CORRETA A: motivo\\n❌ B: motivo\\n📌 Conceito: fundamento\\n💡 Dica Prova: estrategia","tipo":"elaborada"}],"flashcards":[{"frente":"O que e X?","verso":"X e o conceito de forma objetiva"}]}`;

      const raw2 = await chamarGemini(promptFallback, 0.5);
      const json2 = extrairJSON(raw2);
      const dados2: RespostaIA = JSON.parse(json2);
      if (dados2.questoes?.length > 0) {
        if (dados2.flashcards) dados2.flashcards = limparFlashcardsGerados(dados2.flashcards);
        return dados2;
      }
    } catch { /* fallback final silencioso */ }
    return { resumo: "Não foi possível gerar no momento.", questoes: [], flashcards: [] };
  }
};

// ============================================================
// REFORÇO (quando erra ou marca como difícil)
// ============================================================
export const gerarReforcoParaQuestao = async (perguntaOriginal: string, assunto: string): Promise<RespostaIA> => {
  const prompt = `Você é professor de concursos públicos especialista em reforço de aprendizagem.

Aluno precisa de reforço sobre ${assunto}. Questão de referência: ${perguntaOriginal}

Gere 3 questões de reforço (ângulos diferentes) e 3 flashcards de memorização.

FLASHCARDS — PADRÃO CONCEITO/DEFINIÇÃO:
- "frente": pergunta direta ou nome do conceito (máx 10 palavras). Ex: "O que é X?"
- "verso": definição objetiva (máx 20 palavras). Ex: "X é a situação onde Y ocorre."
- PROIBIDO: alternativas, gabaritos comentados, listas, textos longos

REGRAS DE JSON:
- APENAS JSON puro, sem markdown
- Use \\n para separar linhas na explicacao — NUNCA quebre linha real
- Sem aspas dentro dos valores

{"resumo":"Reforço importante.","questoes":[{"pergunta":"Questão de reforço","alternativas":["A) texto","B) texto","C) texto","D) texto","E) texto"],"correta":"A) texto exato","explicacao":"✅ CORRETA A: motivo\\n❌ B: motivo\\n❌ C: motivo\\n❌ D: motivo\\n❌ E: motivo\\n📌 Conceito-chave: fundamento\\n💡 Dica: mneumonico","tipo":"elaborada"}],"flashcards":[{"frente":"O que é ${assunto}?","verso":"Definição direta e objetiva em até 20 palavras"}]}`;

  try {
    const raw = await chamarGemini(prompt, 0.6);
    const json = extrairJSON(raw);
    const dados: RespostaIA = JSON.parse(json);
    if (dados.flashcards) dados.flashcards = limparFlashcardsGerados(dados.flashcards);
    return dados;
  } catch {
    return { resumo: "Erro ao gerar reforço", questoes: [], flashcards: [] };
  }
};

// ============================================================
// REFORÇO DE FLASHCARD (quando erra/difícil no flashcard)
// ============================================================
export const gerarReforcoParaFlashcard = async (
  frente: string,
  verso: string,
  assunto: string
): Promise<Array<{ frente: string; verso: string }>> => {
  const prompt = `Você é professor especialista em memorização para concursos públicos.

O aluno está com dificuldade neste flashcard:
- CONCEITO: ${frente}
- RESPOSTA: ${verso}
- ASSUNTO: ${assunto}

Crie 3 flashcards de reforço relacionados a este conceito, usando ângulos diferentes para fixar o mesmo conhecimento.

PADRÃO OBRIGATÓRIO — CONCEITO/DEFINIÇÃO:
- "frente": pergunta direta ou nome do conceito (máx 10 palavras)
- "verso": definição objetiva (máx 20 palavras)
- PROIBIDO: alternativas (A), B)), gabaritos (✅ ❌), textos longos

Retorne APENAS JSON puro:
{"flashcards":[{"frente":"Pergunta direta","verso":"Resposta objetiva"},{"frente":"Outro ângulo do mesmo conceito","verso":"Resposta objetiva"},{"frente":"Terceiro ângulo","verso":"Resposta objetiva"}]}`;

  try {
    const raw = await chamarGemini(prompt, 0.6);
    const json = extrairJSON(raw);
    const dados = JSON.parse(json) as { flashcards: Array<{ frente: string; verso: string }> };
    return limparFlashcardsGerados(dados.flashcards || []);
  } catch {
    return [];
  }
};

// ============================================================
// FEEDBACK DE DESEMPENHO
// ============================================================
export const gerarFeedbackDesempenho = async (taxaAcerto: number, temasErrados: string[]): Promise<string> => {
  const prompt = `Tutor sênior de concursos públicos. O aluno obteve ${taxaAcerto}% de acerto.
${temasErrados.length > 0 ? `Pontos fracos: ${temasErrados.slice(0, 3).join(", ")}.` : "Desempenho excelente."}
Feedback motivador, estratégico e direto em no máximo 2 frases.`;

  try {
    return await chamarGemini(prompt, 0.8);
  } catch {
    return "Continue praticando! A consistência diária é o diferencial para a aprovação.";
  }
};