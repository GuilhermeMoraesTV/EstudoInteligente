import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

const timestampToMillis = (valor?: Timestamp) => valor?.toMillis?.() ?? 0;

// ==================== PERFIL ====================

export interface PerfilUsuario {
  uid: string;
  email: string;
  nome: string;
  criadoEm: Timestamp;
  modoRevisao?: "espacada" | "diaria";
}

export const criarPerfilUsuario = async (uid: string, email: string, nome: string) => {
  await setDoc(doc(db, "users", uid), {
    uid, email, nome, criadoEm: Timestamp.now(), modoRevisao: "espacada",
  });
};

export const buscarPerfilUsuario = async (uid: string): Promise<PerfilUsuario | null> => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as PerfilUsuario) : null;
};

export const atualizarModoRevisao = async (uid: string, modo: "espacada" | "diaria") => {
  await setDoc(doc(db, "users", uid), { modoRevisao: modo }, { merge: true });
};

// ==================== MATERIAIS ====================

export interface Material {
  id?: string;
  userId: string;
  titulo: string;
  textoOriginal: string;
  resumo: string;
  assuntos: AssuntoSalvo[];
  criadoEm: Timestamp;
}

export interface AssuntoSalvo {
  id: string;
  titulo: string;
  descricao: string;
  trecho: string;
  totalQuestoes?: number;
}

export const salvarMaterial = async (
  userId: string,
  titulo: string,
  textoOriginal: string,
  resumo: string,
  assuntos: AssuntoSalvo[]
): Promise<string> => {
  const docRef = await addDoc(collection(db, "materiais"), {
    userId, titulo, textoOriginal, resumo, assuntos,
    criadoEm: Timestamp.now(),
  });
  return docRef.id;
};

export const buscarMateriaisDoUsuario = async (userId: string): Promise<Material[]> => {
  const q = query(collection(db, "materiais"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Material))
    .sort((a, b) => timestampToMillis(b.criadoEm) - timestampToMillis(a.criadoEm));
};

export const buscarMaterialPorId = async (materialId: string): Promise<Material | null> => {
  const docRef = doc(db, "materiais", materialId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Material) : null;
};

export const excluirMaterial = async (materialId: string, userId: string): Promise<void> => {
  await deleteDoc(doc(db, "materiais", materialId));

  const qQuestoes = query(collection(db, "questoes"), where("userId", "==", userId), where("materialId", "==", materialId));
  const snapQuestoes = await getDocs(qQuestoes);
  if (snapQuestoes.docs.length > 0) {
    const b = writeBatch(db);
    snapQuestoes.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
  }

  const qFlash = query(collection(db, "flashcards"), where("userId", "==", userId), where("materialId", "==", materialId));
  const snapFlash = await getDocs(qFlash);
  if (snapFlash.docs.length > 0) {
    const b = writeBatch(db);
    snapFlash.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
  }
};

export const renomearMaterial = async (materialId: string, novoTitulo: string): Promise<void> => {
  await updateDoc(doc(db, "materiais", materialId), { titulo: novoTitulo });
};

export const renomearAssunto = async (
  materialId: string,
  assuntoId: string,
  novoTitulo: string,
  assuntosAtuais: AssuntoSalvo[]
): Promise<void> => {
  const novosAssuntos = assuntosAtuais.map((a) => a.id === assuntoId ? { ...a, titulo: novoTitulo } : a);
  await updateDoc(doc(db, "materiais", materialId), { assuntos: novosAssuntos });
};

// ==================== QUESTÕES ====================

export interface Questao {
  id?: string;
  userId: string;
  materialId: string;
  assuntoId: string;
  assuntoTitulo: string;
  pergunta: string;
  alternativas: string[];
  correta: string;
  explicacao: string;
  tipo: "simples" | "elaborada";
  criadoEm: Timestamp;
}

export const salvarQuestoes = async (
  userId: string,
  materialId: string,
  assuntoId: string,
  assuntoTitulo: string,
  questoes: Array<{
    pergunta: string;
    alternativas: string[];
    correta: string;
    explicacao: string;
    tipo?: "simples" | "elaborada";
  }>
): Promise<string[]> => {
  const ids: string[] = [];
  for (const q of questoes) {
    const docRef = await addDoc(collection(db, "questoes"), {
      userId, materialId, assuntoId, assuntoTitulo,
      pergunta: q.pergunta, alternativas: q.alternativas,
      correta: q.correta, explicacao: q.explicacao,
      tipo: q.tipo || "elaborada", criadoEm: Timestamp.now(),
    });
    ids.push(docRef.id);
  }
  return ids;
};

export const buscarQuestoesPorAssunto = async (userId: string, materialId: string, assuntoId: string): Promise<Questao[]> => {
  const q = query(
    collection(db, "questoes"),
    where("userId", "==", userId),
    where("materialId", "==", materialId),
    where("assuntoId", "==", assuntoId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Questao));
};

// ==================== FLASHCARDS ====================

export interface Flashcard {
  id?: string;
  userId: string;
  materialId: string;
  materialTitulo?: string;
  assuntoId: string;
  assuntoTitulo: string;
  frente: string;
  verso: string;
  origem: "gerado" | "erro" | "manual";
  proximaRevisao: Timestamp;
  intervalo: number;
  facilidade: number;
  repeticoes: number;
  criadoEm: Timestamp;
}

export const salvarFlashcards = async (
  userId: string,
  materialId: string,
  assuntoId: string,
  assuntoTitulo: string,
  flashcards: Array<{ frente: string; verso: string }>,
  origem: "gerado" | "erro" | "manual" = "gerado",
  materialTitulo?: string
): Promise<string[]> => {
  const ids: string[] = [];
  const agora = Timestamp.now();
  for (const fc of flashcards) {
    const docRef = await addDoc(collection(db, "flashcards"), {
      userId, materialId, assuntoId, assuntoTitulo,
      materialTitulo: materialTitulo || "",
      frente: fc.frente, verso: fc.verso, origem,
      proximaRevisao: agora, intervalo: 1, facilidade: 2.5, repeticoes: 0,
      criadoEm: agora,
    });
    ids.push(docRef.id);
  }
  return ids;
};

// Criar flashcard manual (sem material vinculado ou com material)
export const criarFlashcardManual = async (
  userId: string,
  frente: string,
  verso: string,
  opcoes: {
    materialId?: string;
    materialTitulo?: string;
    assuntoId?: string;
    assuntoTitulo?: string;
  } = {}
): Promise<string> => {
  const agora = Timestamp.now();
  const docRef = await addDoc(collection(db, "flashcards"), {
    userId,
    materialId: opcoes.materialId || "manual",
    materialTitulo: opcoes.materialTitulo || "Criados manualmente",
    assuntoId: opcoes.assuntoId || "manual",
    assuntoTitulo: opcoes.assuntoTitulo || "Manual",
    frente,
    verso,
    origem: "manual",
    proximaRevisao: agora,
    intervalo: 1,
    facilidade: 2.5,
    repeticoes: 0,
    criadoEm: agora,
  });
  return docRef.id;
};

export const buscarFlashcardsPendentes = async (userId: string): Promise<Flashcard[]> => {
  const agora = Timestamp.now();
  const q = query(collection(db, "flashcards"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Flashcard))
    .filter((f) => timestampToMillis(f.proximaRevisao) <= agora.toMillis())
    .sort((a, b) => timestampToMillis(a.proximaRevisao) - timestampToMillis(b.proximaRevisao));
};

export const buscarTodosFlashcardsDoUsuario = async (userId: string): Promise<Flashcard[]> => {
  const q = query(collection(db, "flashcards"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Flashcard));
};

export const buscarFlashcardsPorMaterial = async (userId: string, materialId: string): Promise<Flashcard[]> => {
  const q = query(
    collection(db, "flashcards"),
    where("userId", "==", userId),
    where("materialId", "==", materialId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Flashcard))
    .sort((a, b) => timestampToMillis(a.criadoEm) - timestampToMillis(b.criadoEm));
};

export const excluirFlashcard = async (flashcardId: string): Promise<void> => {
  await deleteDoc(doc(db, "flashcards", flashcardId));
};

export const excluirFlashcardsBatch = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const b = writeBatch(db);
  ids.forEach((id) => b.delete(doc(db, "flashcards", id)));
  await b.commit();
};

export const editarFlashcard = async (flashcardId: string, frente: string, verso: string): Promise<void> => {
  await updateDoc(doc(db, "flashcards", flashcardId), { frente, verso });
};

export const atualizarFlashcard = async (
  flashcardId: string,
  qualidade: number,
  modoRevisao: "espacada" | "diaria" = "espacada"
) => {
  const docRef = doc(db, "flashcards", flashcardId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;

  const dados = docSnap.data() as Flashcard;
  let { intervalo, facilidade, repeticoes } = dados;

  if (modoRevisao === "diaria") {
    const prox = new Date();
    prox.setDate(prox.getDate() + 1);
    await updateDoc(docRef, { repeticoes: repeticoes + 1, proximaRevisao: Timestamp.fromDate(prox) });
    return;
  }

  // SM-2
  if (qualidade === 0) {
    intervalo = 1; repeticoes = 0; facilidade = Math.max(1.3, facilidade - 0.2);
  } else if (qualidade === 1) {
    repeticoes += 1;
    intervalo = repeticoes === 1 ? 1 : repeticoes === 2 ? 3 : Math.round(intervalo * facilidade * 0.8);
    facilidade = Math.max(1.3, facilidade - 0.1);
  } else {
    repeticoes += 1;
    intervalo = repeticoes === 1 ? 1 : repeticoes === 2 ? 6 : Math.round(intervalo * facilidade);
    facilidade = facilidade + 0.1;
  }

  const prox = new Date();
  prox.setDate(prox.getDate() + intervalo);
  await updateDoc(docRef, { intervalo, facilidade, repeticoes, proximaRevisao: Timestamp.fromDate(prox) });
};

// ==================== HISTÓRICO ====================

export interface HistoricoResposta {
  id?: string;
  userId: string;
  tipo: "questao" | "flashcard";
  itemId: string;
  acertou: boolean;
  tempoGasto: number;
  assuntoId?: string;
  assuntoTitulo?: string;
  pergunta?: string;
  criadoEm: Timestamp;
}

export const registrarResposta = async (
  userId: string,
  tipo: "questao" | "flashcard",
  itemId: string,
  acertou: boolean,
  tempoGasto: number,
  extra?: { assuntoId?: string; assuntoTitulo?: string; pergunta?: string }
) => {
  await addDoc(collection(db, "historico_respostas"), {
    userId, tipo, itemId, acertou, tempoGasto,
    assuntoId: extra?.assuntoId || "",
    assuntoTitulo: extra?.assuntoTitulo || "",
    pergunta: extra?.pergunta || "",
    criadoEm: Timestamp.now(),
  });
};

export const buscarHistoricoDoUsuario = async (userId: string): Promise<HistoricoResposta[]> => {
  const q = query(collection(db, "historico_respostas"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as HistoricoResposta))
    .sort((a, b) => timestampToMillis(b.criadoEm) - timestampToMillis(a.criadoEm));
};

export const calcularEstatisticas = async (userId: string) => {
  const [historico, materiais, flashcardsPendentes] = await Promise.all([
    buscarHistoricoDoUsuario(userId),
    buscarMateriaisDoUsuario(userId),
    buscarFlashcardsPendentes(userId),
  ]);

  const totalRespostas = historico.length;
  const acertos = historico.filter((h) => h.acertou).length;
  const taxaAcerto = totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 100) : 0;

  const respostasQuestoes = historico.filter((h) => h.tipo === "questao");
  const acertosQuestoes = respostasQuestoes.filter((h) => h.acertou).length;
  const taxaAcertoQuestoes = respostasQuestoes.length > 0
    ? Math.round((acertosQuestoes / respostasQuestoes.length) * 100) : 0;

  return {
    totalMateriais: materiais.length,
    totalRespostas,
    taxaAcerto,
    taxaAcertoQuestoes,
    flashcardsPendentes: flashcardsPendentes.length,
    ultimasRespostas: historico.slice(0, 10),
  };
};

// Alias de compatibilidade
export const gerarReforcoParaQuestao = async () => ({ questoes: [], flashcards: [] });