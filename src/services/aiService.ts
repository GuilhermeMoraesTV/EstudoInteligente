// Serviço centralizado para chamadas à API do Google Gemini.
// Utiliza o modelo gemini-2.0-flash para extrema rapidez.
// Todas as respostas são em JSON estruturado.

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!API_KEY) {
  console.warn(
    "⚠️ VITE_GEMINI_API_KEY não configurada. Adicione-a ao arquivo .env na raiz do projeto."
  );
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

// Formato esperado da resposta da IA
export interface RespostaIA {
  resumo: string;
  questoes: Array<{
    pergunta: string;
    alternativas: string[];
    correta: string;
    explicacao: string;
  }>;
  flashcards: Array<{
    frente: string;
    verso: string;
  }>;
}

/**
 * Gera questões, flashcards e resumo a partir de um texto fornecido.
 * Usa JSON Mode para garantir saída estruturada.
 */
export const gerarConteudoEstudo = async (texto: string): Promise<RespostaIA> => {
  if (!API_KEY) {
    throw new Error(
      "API Key do Gemini não configurada. Defina VITE_GEMINI_API_KEY no arquivo .env."
    );
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });

  const prompt = `Você é um professor especialista em concursos públicos brasileiros. Analise o texto abaixo e gere conteúdo de estudo de alta qualidade.

REGRAS OBRIGATÓRIAS:
1. Gere um resumo conciso dos pontos principais do texto.
2. Gere exatamente 5 questões no estilo de concurso público (múltipla escolha com 5 alternativas: A, B, C, D, E).
3. Gere exatamente 10 flashcards com conceitos-chave para memorização.
4. As questões devem testar compreensão profunda, não apenas memorização superficial.
5. Os flashcards devem ter a frente com uma pergunta/conceito curto e o verso com a resposta objetiva.

Retorne EXATAMENTE neste formato JSON:
{
  "resumo": "String com o resumo dos pontos principais",
  "questoes": [
    {
      "pergunta": "String com o enunciado da questão",
      "alternativas": ["A) texto", "B) texto", "C) texto", "D) texto", "E) texto"],
      "correta": "A) texto (a alternativa completa exata que é a correta)",
      "explicacao": "String com a justificativa detalhada da resposta correta"
    }
  ],
  "flashcards": [
    {
      "frente": "String com o conceito ou pergunta",
      "verso": "String com a resposta curta e objetiva"
    }
  ]
}

TEXTO PARA ANÁLISE:
${texto}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const textoResposta = response.text();

    // Tenta parsear o JSON retornado
    const dados: RespostaIA = JSON.parse(textoResposta);

    // Validação básica da estrutura
    if (!dados.resumo || !Array.isArray(dados.questoes) || !Array.isArray(dados.flashcards)) {
      throw new Error("Estrutura de resposta inválida da IA.");
    }

    if (dados.questoes.length === 0) {
      throw new Error("A IA não gerou nenhuma questão. Tente novamente com um texto mais longo.");
    }

    if (dados.flashcards.length === 0) {
      throw new Error("A IA não gerou nenhum flashcard. Tente novamente.");
    }

    return dados;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        "Erro ao processar a resposta da IA. O formato JSON retornado é inválido. Tente novamente."
      );
    }
    throw error;
  }
};

/**
 * Gera feedback personalizado baseado no desempenho do usuário.
 */
export const gerarFeedbackDesempenho = async (
  taxaAcerto: number,
  temasErrados: string[]
): Promise<string> => {
  if (!API_KEY) {
    return "Configure a API Key do Gemini para receber feedback personalizado.";
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 512,
    },
  });

  const prompt = `Você é um tutor de concursos públicos. O aluno acabou de terminar uma sessão de estudo com taxa de acerto de ${taxaAcerto}%.

${temasErrados.length > 0 ? `Ele errou questões sobre os seguintes temas: ${temasErrados.join(", ")}.` : "Ele acertou todas as questões."}

Dê um feedback breve, motivador e estratégico (máximo 3 frases). Sugira o que ele deve revisar ou como pode melhorar. Seja direto e objetivo.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return "Continue praticando! A consistência é a chave para a aprovação em concursos.";
  }
};
