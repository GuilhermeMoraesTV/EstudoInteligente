// Serviço centralizado para chamadas à API do Google Gemini.
// Usa fallback automático entre modelos para evitar erros 404 de modelo indisponível.
// Todas as respostas são em JSON estruturado.

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!API_KEY) {
  console.warn(
    "⚠️ VITE_GEMINI_API_KEY não configurada. Adicione-a ao arquivo .env na raiz do projeto."
  );
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

const MODELOS_GEMINI = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-1.5-pro-latest",
  "gemini-1.5-flash-latest",
  "gemini-2.0-flash",
];

type ConfiguracaoGeracao = {
  responseMimeType?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

const ehErroModeloIndisponivel = (mensagem: string) => {
  const msg = mensagem.toLowerCase();
  return (
    msg.includes("404") &&
    (msg.includes("not found") ||
      msg.includes("no longer available") ||
      msg.includes("is not found") ||
      msg.includes("models/"))
  );
};

const gerarTextoComFallbackDeModelo = async (
  prompt: string,
  generationConfig: ConfiguracaoGeracao
): Promise<string> => {
  let ultimoErro: unknown;

  for (const nomeModelo of MODELOS_GEMINI) {
    try {
      const model = genAI.getGenerativeModel({
        model: nomeModelo,
        generationConfig,
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      const mensagem = error?.message || "";
      if (ehErroModeloIndisponivel(mensagem)) {
        ultimoErro = error;
        continue;
      }
      throw error;
    }
  }

  throw (
    ultimoErro ||
    new Error("Nenhum modelo Gemini disponível para esta API key no momento.")
  );
};

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

  const MAX_TENTATIVAS = 3;
  let tentativa = 0;
  let atraso = 5000; // 5 segundos inicial

  while (tentativa < MAX_TENTATIVAS) {
    try {
      const textoResposta = await gerarTextoComFallbackDeModelo(prompt, {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 8192,
      });

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
    } catch (error: any) {
      const mensagem = error?.message || "";

      // Se for erro de cota/rate limit (429), tenta novamente com backoff
      if (mensagem.includes("429") || mensagem.includes("quota") || mensagem.includes("Quota")) {
        tentativa++;
        if (tentativa >= MAX_TENTATIVAS) {
          throw new Error(
            "Cota da API do Gemini excedida. Você atingiu o limite gratuito. Ative o billing no Google Cloud Console ou aguarde alguns minutos e tente novamente."
          );
        }
        console.warn(`Cota excedida. Tentando novamente em ${atraso / 1000}s... (Tentativa ${tentativa}/${MAX_TENTATIVAS})`);
        await new Promise((resolve) => setTimeout(resolve, atraso));
        atraso *= 2; // Backoff exponencial
        continue;
      }

      if (ehErroModeloIndisponivel(mensagem)) {
        throw new Error(
          "Os modelos Gemini configurados não estão disponíveis para esta API key/projeto. Gere uma nova API key no AI Studio e tente novamente."
        );
      }

      if (error instanceof SyntaxError) {
        throw new Error(
          "Erro ao processar a resposta da IA. O formato JSON retornado é inválido. Tente novamente."
        );
      }
      throw error;
    }
  }

  throw new Error("Falha após múltiplas tentativas. Tente novamente mais tarde.");
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

  const prompt = `Você é um tutor de concursos públicos. O aluno acabou de terminar uma sessão de estudo com taxa de acerto de ${taxaAcerto}%.

${temasErrados.length > 0 ? `Ele errou questões sobre os seguintes temas: ${temasErrados.join(", ")}.` : "Ele acertou todas as questões."}

Dê um feedback breve, motivador e estratégico (máximo 3 frases). Sugira o que ele deve revisar ou como pode melhorar. Seja direto e objetivo.`;

  try {
    return await gerarTextoComFallbackDeModelo(prompt, {
      temperature: 0.5,
      maxOutputTokens: 512,
    });
  } catch {
    return "Continue praticando! A consistência é a chave para a aprovação em concursos.";
  }
};
