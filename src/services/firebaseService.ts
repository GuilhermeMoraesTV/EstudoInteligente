// Serviço centralizado para operações no Firebase Firestore.
// Gerencia todas as coleções: users, materiais, questoes, flashcards, historico_respostas.

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// ==================== PERFIL DO USUÁRIO ====================

export interface PerfilUsuario {
  uid: string;
  email: string;
  nome: string;
  criadoEm: Timestamp;
}

/** Cria o perfil do usuário no Firestore após o cadastro */
export const criarPerfilUsuario = async (uid: string, email: string, nome: string) => {
  await setDoc(doc(db, "users", uid), {
    uid,
    email,
    nome,
    criadoEm: Timestamp.now(),
  });
};

/** Busca o perfil do usuário */
export const buscarPerfilUsuario = async (uid: string): Promise<PerfilUsuario | null> => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as PerfilUsuario;
  }
  return null;
};

// ==================== MATERIAIS ====================

export interface Material {
  id?: string;
  userId: string;
  titulo: string;
  textoOriginal: string;
  resumo: string;
  criadoEm: Timestamp;
}

/** Salva o material enviado pelo usuário junto com o resumo gerado pela IA */
export const salvarMaterial = async (
  userId: string,
  titulo: string,
  textoOriginal: string,
  resumo: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, "materiais"), {
    userId,
    titulo,
    textoOriginal,
    resumo,
    criadoEm: Timestamp.now(),
  });
  return docRef.id;
};

/** Busca todos os materiais do usuário */
export const buscarMateriaisDoUsuario = async (userId: string): Promise<Material[]> => {
  const q = query(
    collection(db, "materiais"),
    where("userId", "==", userId),
    orderBy("criadoEm", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Material));
};

// ==================== QUESTÕES ====================

export interface Questao {
  id?: string;
  userId: string;
  materialId: string;
  pergunta: string;
  alternativas: string[];
  correta: string;
  explicacao: string;
  criadoEm: Timestamp;
}

/** Salva uma lista de questões geradas pela IA */
export const salvarQuestoes = async (
  userId: string,
  materialId: string,
  questoes: Array<{
    pergunta: string;
    alternativas: string[];
    correta: string;
    explicacao: string;
  }>
): Promise<string[]> => {
  const ids: string[] = [];
  for (const q of questoes) {
    const docRef = await addDoc(collection(db, "questoes"), {
      userId,
      materialId,
      pergunta: q.pergunta,
      alternativas: q.alternativas,
      correta: q.correta,
      explicacao: q.explicacao,
      criadoEm: Timestamp.now(),
    });
    ids.push(docRef.id);
  }
  return ids;
};

/** Busca questões de um material específico */
export const buscarQuestoesPorMaterial = async (
  userId: string,
  materialId: string
): Promise<Questao[]> => {
  const q = query(
    collection(db, "questoes"),
    where("userId", "==", userId),
    where("materialId", "==", materialId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Questao));
};

/** Busca todas as questões do usuário */
export const buscarTodasQuestoesDoUsuario = async (userId: string): Promise<Questao[]> => {
  const q = query(collection(db, "questoes"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Questao));
};

// ==================== FLASHCARDS ====================

export interface Flashcard {
  id?: string;
  userId: string;
  materialId: string;
  frente: string;
  verso: string;
  proximaRevisao: Timestamp;
  intervalo: number; // em dias
  facilidade: number; // fator de facilidade (padrão: 2.5)
  repeticoes: number;
  criadoEm: Timestamp;
}

/** Salva flashcards gerados pela IA com parâmetros iniciais de repetição espaçada */
export const salvarFlashcards = async (
  userId: string,
  materialId: string,
  flashcards: Array<{ frente: string; verso: string }>
): Promise<string[]> => {
  const ids: string[] = [];
  const agora = Timestamp.now();
  for (const fc of flashcards) {
    const docRef = await addDoc(collection(db, "flashcards"), {
      userId,
      materialId,
      frente: fc.frente,
      verso: fc.verso,
      proximaRevisao: agora,
      intervalo: 1,
      facilidade: 2.5,
      repeticoes: 0,
      criadoEm: agora,
    });
    ids.push(docRef.id);
  }
  return ids;
};

/** Busca flashcards pendentes de revisão (data <= agora) */
export const buscarFlashcardsPendentes = async (userId: string): Promise<Flashcard[]> => {
  const agora = Timestamp.now();
  const q = query(
    collection(db, "flashcards"),
    where("userId", "==", userId),
    where("proximaRevisao", "<=", agora)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Flashcard));
};

/** Busca todos os flashcards do usuário */
export const buscarTodosFlashcardsDoUsuario = async (userId: string): Promise<Flashcard[]> => {
  const q = query(collection(db, "flashcards"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Flashcard));
};

/** Atualiza os parâmetros de repetição espaçada de um flashcard (algoritmo SM-2 simplificado) */
export const atualizarFlashcard = async (
  flashcardId: string,
  qualidade: number // 0 = errou, 1 = difícil, 2 = fácil
) => {
  const docRef = doc(db, "flashcards", flashcardId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;

  const dados = docSnap.data() as Flashcard;
  let { intervalo, facilidade, repeticoes } = dados;

  if (qualidade === 0) {
    // Errou: resetar
    intervalo = 1;
    repeticoes = 0;
    facilidade = Math.max(1.3, facilidade - 0.2);
  } else if (qualidade === 1) {
    // Difícil: avança pouco
    repeticoes += 1;
    if (repeticoes === 1) {
      intervalo = 1;
    } else if (repeticoes === 2) {
      intervalo = 3;
    } else {
      intervalo = Math.round(intervalo * facilidade * 0.8);
    }
    facilidade = Math.max(1.3, facilidade - 0.1);
  } else {
    // Fácil: avança normalmente
    repeticoes += 1;
    if (repeticoes === 1) {
      intervalo = 1;
    } else if (repeticoes === 2) {
      intervalo = 6;
    } else {
      intervalo = Math.round(intervalo * facilidade);
    }
    facilidade = facilidade + 0.1;
  }

  const proximaData = new Date();
  proximaData.setDate(proximaData.getDate() + intervalo);

  await updateDoc(docRef, {
    intervalo,
    facilidade,
    repeticoes,
    proximaRevisao: Timestamp.fromDate(proximaData),
  });
};

// ==================== HISTÓRICO DE RESPOSTAS ====================

export interface HistoricoResposta {
  id?: string;
  userId: string;
  tipo: "questao" | "flashcard";
  itemId: string;
  acertou: boolean;
  tempoGasto: number; // em segundos
  criadoEm: Timestamp;
}

/** Registra uma resposta no histórico */
export const registrarResposta = async (
  userId: string,
  tipo: "questao" | "flashcard",
  itemId: string,
  acertou: boolean,
  tempoGasto: number
) => {
  await addDoc(collection(db, "historico_respostas"), {
    userId,
    tipo,
    itemId,
    acertou,
    tempoGasto,
    criadoEm: Timestamp.now(),
  });
};

/** Busca todo o histórico de respostas do usuário */
export const buscarHistoricoDoUsuario = async (
  userId: string
): Promise<HistoricoResposta[]> => {
  const q = query(
    collection(db, "historico_respostas"),
    where("userId", "==", userId),
    orderBy("criadoEm", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HistoricoResposta));
};

/** Calcula estatísticas gerais do usuário */
export const calcularEstatisticas = async (userId: string) => {
  const historico = await buscarHistoricoDoUsuario(userId);
  const materiais = await buscarMateriaisDoUsuario(userId);
  const flashcardsPendentes = await buscarFlashcardsPendentes(userId);

  const totalRespostas = historico.length;
  const acertos = historico.filter((h) => h.acertou).length;
  const taxaAcerto = totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 100) : 0;

  const respostasQuestoes = historico.filter((h) => h.tipo === "questao");
  const acertosQuestoes = respostasQuestoes.filter((h) => h.acertou).length;
  const taxaAcertoQuestoes =
    respostasQuestoes.length > 0
      ? Math.round((acertosQuestoes / respostasQuestoes.length) * 100)
      : 0;

  return {
    totalMateriais: materiais.length,
    totalRespostas,
    taxaAcerto,
    taxaAcertoQuestoes,
    flashcardsPendentes: flashcardsPendentes.length,
    ultimasRespostas: historico.slice(0, 10),
  };
};
