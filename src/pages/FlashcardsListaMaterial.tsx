import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  buscarFlashcardsPorMaterial,
  buscarMaterialPorId,
  excluirFlashcard,
  editarFlashcard,
  Flashcard,
  Material,
} from "../services/firebaseService";
import Navbar from "../components/Navbar";

type OrdemTipo = "recentes" | "antigos" | "pendentes";

// ---- Card panorâmico ----
const FlashcardPanoramico = ({
  flashcard,
  onClicar,
  onExcluir,
}: {
  flashcard: Flashcard;
  onClicar: (fc: Flashcard) => void;
  onExcluir: (id: string) => void;
}) => {
  const agora = Date.now();
  const prox = flashcard.proximaRevisao?.toMillis?.() ?? 0;
  const pendente = prox <= agora;
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const handleExcluir = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmando) {
      setExcluindo(true);
      await onExcluir(flashcard.id!);
      setExcluindo(false);
    } else {
      setConfirmando(true);
      setTimeout(() => setConfirmando(false), 3000);
    }
  };

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/10 hover:border-violet-500/40 cursor-pointer transition-all duration-300 card-hover"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(99,102,241,0.04))" }} />
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative p-4" onClick={() => onClicar(flashcard)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pendente ? "bg-yellow-400 animate-pulse" : "bg-success"}`} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate max-w-[120px]">
              {flashcard.assuntoTitulo}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {flashcard.origem === "erro" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                Reforço
              </span>
            )}
            {pendente && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 animate-pulse">
                Pendente
              </span>
            )}
          </div>
        </div>

        {/* Frente do card */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-2.5 h-2.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <p className="text-[9px] text-violet-400/70 font-semibold uppercase tracking-wider">Pergunta</p>
          </div>
          {/* Texto com scroll se muito longo */}
          <p className="text-sm text-white font-medium leading-relaxed line-clamp-3">
            {flashcard.frente}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
          <svg className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          <span className="text-[10px] text-muted-foreground/50 flex-1">Clique para ver a resposta</span>
          <span className="text-[10px] text-muted-foreground/40 flex-shrink-0">
            {flashcard.repeticoes}× revisado
          </span>
        </div>
      </div>

      {/* Botão excluir — aparece no hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleExcluir}
          disabled={excluindo}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
            confirmando
              ? "bg-red-500/20 border-red-500/40 text-red-400"
              : "bg-black/40 border-white/10 text-muted-foreground hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400"
          }`}
        >
          {excluindo ? (
            <div className="w-3 h-3 rounded-full border border-red-400/40 border-t-red-400 animate-spin" />
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
          {confirmando ? "Confirmar?" : ""}
        </button>
      </div>
    </div>
  );
};

// ---- Modal de estudo com edição e responsividade mobile ----
const ModalEstudoFlashcard = ({
  flashcard,
  onFechar,
  onSalvar,
}: {
  flashcard: Flashcard;
  onFechar: () => void;
  onSalvar: (id: string, frente: string, verso: string) => Promise<void>;
}) => {
  const [virado, setVirado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [draftFrente, setDraftFrente] = useState(flashcard.frente);
  const [draftVerso, setDraftVerso] = useState(flashcard.verso);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setVirado(false);
    setEditando(false);
    setDraftFrente(flashcard.frente);
    setDraftVerso(flashcard.verso);
  }, [flashcard.id]);

  const handleSalvar = async () => {
    setSalvando(true);
    try { await onSalvar(flashcard.id!, draftFrente.trim(), draftVerso.trim()); }
    finally { setSalvando(false); setEditando(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div className="w-full sm:max-w-lg animate-scale-in rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ border: "1px solid rgba(139,92,246,0.2)", background: "rgba(16,14,30,0.98)" }}>

        {/* Header do modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            {flashcard.assuntoTitulo}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditando(!editando)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${editando ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {editando ? "Cancelar" : "Editar"}
            </button>
            <button onClick={onFechar}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modo edição */}
        {editando ? (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Pergunta (Frente)</label>
              <textarea
                value={draftFrente}
                onChange={(e) => setDraftFrente(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-success uppercase tracking-wider mb-2">Resposta (Verso)</label>
              <textarea
                value={draftVerso}
                onChange={(e) => setDraftVerso(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-success/60 focus:ring-1 focus:ring-success/30 resize-none"
              />
            </div>
            <button onClick={handleSalvar} disabled={salvando}
              className="btn-primary w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50">
              {salvando ? "Salvando..." : "✓ Salvar alterações"}
            </button>
          </div>
        ) : (
          /* Modo visualização com flip */
          <div className="p-5">
            {/* Card com flip — usando transform inline */}
            <div
              className="relative cursor-pointer mb-4"
              style={{ height: "260px", perspective: "1400px" }}
              onClick={() => setVirado((v) => !v)}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transformStyle: "preserve-3d",
                  transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: virado ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* FRENTE */}
                <div
                  style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    borderRadius: "1rem",
                    border: "1px solid rgba(139,92,246,0.2)",
                    background: "rgba(20,18,40,0.85)",
                    display: "flex", flexDirection: "column",
                    padding: "1.25rem",
                    overflowY: "auto",
                  }}
                >
                  <p className="text-[10px] text-violet-400/70 font-semibold uppercase tracking-wider mb-3">Pergunta</p>
                  {/* Texto com scroll em mobile para conteúdo longo */}
                  <div className="flex-1 overflow-y-auto">
                    <p className="text-base text-white font-medium leading-relaxed">{flashcard.frente}</p>
                  </div>
                  {!virado && (
                    <div className="flex justify-center mt-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        Toque para revelar
                      </span>
                    </div>
                  )}
                </div>

                {/* VERSO */}
                <div
                  style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    borderRadius: "1rem",
                    border: "1px solid rgba(52,211,153,0.25)",
                    background: "linear-gradient(135deg, rgba(52,211,153,0.08), rgba(16,185,129,0.04))",
                    display: "flex", flexDirection: "column",
                    padding: "1.25rem",
                    overflowY: "auto",
                  }}
                >
                  <p className="text-[10px] text-success/70 font-semibold uppercase tracking-wider mb-3">Resposta</p>
                  <div className="flex-1 overflow-y-auto">
                    <p className="text-base text-white font-medium leading-relaxed">{flashcard.verso}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {virado ? "Toque para ver a pergunta" : "Toque no card para revelar a resposta"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Página principal ----
const FlashcardsListaMaterial = () => {
  const { materialId } = useParams<{ materialId: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [material, setMaterial] = useState<Material | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [flashcardSelecionado, setFlashcardSelecionado] = useState<Flashcard | null>(null);
  const [filtroAssunto, setFiltroAssunto] = useState<string>("todos");
  const [filtroPendentes, setFiltroPendentes] = useState(false);
  const [ordem, setOrdem] = useState<OrdemTipo>("recentes");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!usuario || !materialId) return;
    const carregar = async () => {
      try {
        const [mat, fcs] = await Promise.all([
          buscarMaterialPorId(materialId),
          buscarFlashcardsPorMaterial(usuario.uid, materialId),
        ]);
        setMaterial(mat);
        setFlashcards(fcs);
      } catch { /* silent */ }
      finally {
        setCarregando(false);
        setTimeout(() => setVisible(true), 100);
      }
    };
    carregar();
  }, [usuario, materialId]);

  const handleExcluir = async (id: string) => {
    await excluirFlashcard(id);
    setFlashcards((prev) => prev.filter((f) => f.id !== id));
    if (flashcardSelecionado?.id === id) setFlashcardSelecionado(null);
  };

  const handleSalvarEdicao = async (id: string, frente: string, verso: string) => {
    await editarFlashcard(id, frente, verso);
    setFlashcards((prev) => prev.map((f) => f.id === id ? { ...f, frente, verso } : f));
    if (flashcardSelecionado?.id === id) {
      setFlashcardSelecionado((prev) => prev ? { ...prev, frente, verso } : prev);
    }
  };

  const assuntos = Array.from(new Set(flashcards.map((f) => f.assuntoTitulo)));
  const agora = Date.now();

  const flashcardsFiltrados = flashcards
    .filter((f) => {
      const matchAssunto = filtroAssunto === "todos" || f.assuntoTitulo === filtroAssunto;
      const matchPendente = !filtroPendentes || (f.proximaRevisao?.toMillis?.() ?? 0) <= agora;
      return matchAssunto && matchPendente;
    })
    .sort((a, b) => {
      if (ordem === "recentes") return (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0);
      if (ordem === "antigos") return (a.criadoEm?.toMillis?.() ?? 0) - (b.criadoEm?.toMillis?.() ?? 0);
      // pendentes primeiro
      const aPend = (a.proximaRevisao?.toMillis?.() ?? 0) <= agora ? 0 : 1;
      const bPend = (b.proximaRevisao?.toMillis?.() ?? 0) <= agora ? 0 : 1;
      return aPend - bPend;
    });

  const totalPendentes = flashcards.filter((f) => (f.proximaRevisao?.toMillis?.() ?? 0) <= agora).length;

  if (carregando) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl animate-brain-pulse">🃏</div>
          </div>
          <p className="text-muted-foreground text-sm">Carregando flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <main className="relative mx-auto max-w-6xl px-4 pt-24 pb-16">
        {/* Breadcrumb */}
        <div className={`mb-6 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
          <button onClick={() => navigate(`/estudos/${materialId}`)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {material?.titulo || "Material"}
          </button>
        </div>

        {/* Header */}
        <div className={`mb-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <span className="text-xs font-medium text-violet-400 uppercase tracking-widest">Visão Panorâmica</span>
          <div className="flex items-center justify-between mt-2 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              {material?.titulo}
            </h1>
            <button
              onClick={() => navigate("/flashcards")}
              className="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shrink-0"
            >
              <span>🃏</span>
              <span className="hidden sm:inline">Revisar Agora</span>
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            <span>{flashcards.length} flashcard{flashcards.length !== 1 ? "s" : ""} total</span>
            {totalPendentes > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                {totalPendentes} pendente{totalPendentes !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Filtros + Ordenação */}
        <div className={`mb-6 space-y-3 transition-all duration-700 delay-100 ${visible ? "opacity-100" : "opacity-0"}`}>
          {/* Linha 1: Pendentes + Todos */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroPendentes(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${!filtroPendentes ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "border-white/10 text-muted-foreground hover:text-white"}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroPendentes(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border flex items-center gap-1.5 ${filtroPendentes ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" : "border-white/10 text-muted-foreground hover:text-white"}`}
            >
              Pendentes
              {totalPendentes > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500/30 text-yellow-400 text-[9px] font-bold">
                  {totalPendentes}
                </span>
              )}
            </button>

            <div className="w-px bg-white/10 self-stretch mx-1" />

            {/* Ordenação */}
            {(["recentes", "antigos", "pendentes"] as OrdemTipo[]).map((o) => (
              <button
                key={o}
                onClick={() => setOrdem(o)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${ordem === o ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "border-white/10 text-muted-foreground hover:text-white"}`}
              >
                {o === "recentes" ? "⬆ Mais recentes" : o === "antigos" ? "⬇ Mais antigos" : "⚠ Pendentes primeiro"}
              </button>
            ))}
          </div>

          {/* Linha 2: Assuntos */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroAssunto("todos")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${filtroAssunto === "todos" ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "border-white/10 text-muted-foreground hover:text-white"}`}
            >
              Todos os assuntos
            </button>
            {assuntos.map((a) => (
              <button
                key={a}
                onClick={() => setFiltroAssunto(a)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border max-w-[180px] truncate ${filtroAssunto === a ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "border-white/10 text-muted-foreground hover:text-white"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Grid panorâmico */}
        {flashcardsFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl">📭</span>
            <p className="text-muted-foreground mt-3">Nenhum flashcard encontrado com esses filtros.</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {flashcardsFiltrados.map((fc, idx) => (
              <div
                key={fc.id}
                className="opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx * 40, 600)}ms`, animationFillMode: "forwards" }}
              >
                <FlashcardPanoramico
                  flashcard={fc}
                  onClicar={setFlashcardSelecionado}
                  onExcluir={handleExcluir}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de estudo */}
      {flashcardSelecionado && (
        <ModalEstudoFlashcard
          flashcard={flashcardSelecionado}
          onFechar={() => setFlashcardSelecionado(null)}
          onSalvar={handleSalvarEdicao}
        />
      )}
    </div>
  );
};

export default FlashcardsListaMaterial;