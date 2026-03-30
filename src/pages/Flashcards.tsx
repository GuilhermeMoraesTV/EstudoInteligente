import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  buscarFlashcardsPendentes,
  buscarTodosFlashcardsDoUsuario,
  atualizarFlashcard,
  registrarResposta,
  buscarPerfilUsuario,
  atualizarModoRevisao,
  excluirFlashcard,
  editarFlashcard,
  Flashcard,
} from "../services/firebaseService";
import Navbar from "../components/Navbar";

type ModoRevisao = "espacada" | "diaria";
type OrdemGrupo = "pendentes" | "alfabetica";

interface GrupoAssunto {
  chave: string;
  materialId: string;
  materialTitulo: string;
  assuntoId: string;
  assuntoTitulo: string;
  pendentes: number;
  total: number;
  cards: Flashcard[];
}

// ---- EmptyState ----
const EmptyState = ({ navigate }: { navigate: (p: string) => void }) => (
  <div className="min-h-screen bg-background">
    <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
    <Navbar />
    <div className="relative flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center text-5xl animate-float">🃏</div>
      <div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Nenhum flashcard ainda</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">Estude um material para gerar flashcards automaticamente.</p>
      </div>
      <button onClick={() => navigate("/estudos")} className="btn-primary px-6 py-3 rounded-2xl text-sm font-bold text-white">📚 Ir para Estudos</button>
    </div>
  </div>
);

// ---- CompleteState ----
const CompleteState = ({ revisados, navigate }: { revisados: number; navigate: (p: string) => void }) => (
  <div className="min-h-screen bg-background">
    <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
    <Navbar />
    <div className="relative flex flex-col items-center justify-center min-h-screen gap-8 px-4 text-center">
      <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-success/20 to-emerald-600/20 border border-success/30 flex items-center justify-center text-5xl animate-float"
        style={{ boxShadow: "0 0 50px rgba(52,211,153,0.2)" }}>🎉</div>
      <div>
        <h2 className="text-3xl font-bold text-gradient" style={{ fontFamily: "Syne, sans-serif" }}>Revisão Concluída!</h2>
        <p className="mt-3 text-muted-foreground">Você revisou <span className="text-success font-bold">{revisados}</span> flashcard{revisados !== 1 ? "s" : ""}.</p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={() => navigate("/estudos")} className="glass px-5 py-3 rounded-2xl text-sm font-semibold text-white border border-white/10 hover:bg-white/5 transition-all">← Estudos</button>
        <button onClick={() => window.location.reload()} className="btn-primary px-5 py-3 rounded-2xl text-sm font-bold text-white">🔄 Nova Sessão</button>
      </div>
    </div>
  </div>
);

// ---- RatingButton ----
const RatingButton = ({ label, icon, color, glow, onClick, delay }: {
  label: string; icon: string; color: string; glow: string; onClick: () => void; delay: number;
}) => (
  <button onClick={onClick}
    className="flex-1 flex flex-col items-center gap-1.5 py-3 sm:py-4 rounded-2xl border transition-all duration-200 hover:scale-105 active:scale-95 animate-fade-in-up opacity-0"
    style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards", borderColor: `${color}30`, background: `${color}08` }}
    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 20px ${glow}`)}
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}>
    <span className="text-xl sm:text-2xl">{icon}</span>
    <span className="text-xs font-semibold" style={{ color }}>{label}</span>
  </button>
);

// ---- FlashcardSession ----
const FlashcardSession = ({
  cards, grupo, onVoltar, modoRevisao,
}: {
  cards: Flashcard[];
  grupo: GrupoAssunto;
  onVoltar: () => void;
  modoRevisao: ModoRevisao;
}) => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revisados, setRevisados] = useState(0);
  const [processando, setProcessando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [opacity, setOpacity] = useState(1);
  // Edição inline
  const [editando, setEditando] = useState(false);
  const [draftFrente, setDraftFrente] = useState("");
  const [draftVerso, setDraftVerso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [cardsLocais, setCardsLocais] = useState<Flashcard[]>(cards);

  const flashcardAtual = cardsLocais[indiceAtual];

  const handleFlip = useCallback(() => {
    if (!processando && !editando) setFlipped((p) => !p);
  }, [processando, editando]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); handleFlip(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleFlip]);

  const handleAvaliacao = async (qualidade: number) => {
    if (!usuario || !flashcardAtual?.id || processando) return;
    setProcessando(true);

    try {
      await atualizarFlashcard(flashcardAtual.id, qualidade, modoRevisao);
      await registrarResposta(usuario.uid, "flashcard", flashcardAtual.id, qualidade > 0, 0);
    } catch { /* silent */ }

    setRevisados((p) => p + 1);
    setOpacity(0);
    setTimeout(() => {
      setFlipped(false);
      setEditando(false);
      setTimeout(() => {
        if (indiceAtual < cardsLocais.length - 1) {
          setIndiceAtual((p) => p + 1);
          setOpacity(1);
          setProcessando(false);
        } else {
          setConcluido(true);
        }
      }, 100);
    }, 200);
  };

  const abrirEdicao = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftFrente(flashcardAtual.frente);
    setDraftVerso(flashcardAtual.verso);
    setEditando(true);
  };

  const handleSalvarEdicao = async () => {
    if (!flashcardAtual?.id) return;
    setSalvando(true);
    try {
      await editarFlashcard(flashcardAtual.id, draftFrente.trim(), draftVerso.trim());
      setCardsLocais((prev) => prev.map((c, i) =>
        i === indiceAtual ? { ...c, frente: draftFrente.trim(), verso: draftVerso.trim() } : c
      ));
      setEditando(false);
    } finally { setSalvando(false); }
  };

  if (concluido) return <CompleteState revisados={revisados} navigate={navigate} />;

  const progPercent = (indiceAtual / cardsLocais.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-15 pointer-events-none" />
      <Navbar />
      <main className="relative mx-auto max-w-xl px-4 pt-20 sm:pt-24 pb-16">
        {/* Header */}
        <div className="mb-5 animate-fade-in-down">
          <button onClick={onVoltar} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors mb-4">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="truncate max-w-[160px]">{grupo.assuntoTitulo}</span>
          </button>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <span className="glass rounded-lg px-3 py-1 font-mono font-bold text-violet-400">{indiceAtual + 1}/{cardsLocais.length}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] border ${modoRevisao === "espacada" ? "bg-violet-500/10 border-violet-500/20 text-violet-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
                {modoRevisao === "espacada" ? "🧠 SM-2" : "📅 Diária"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">{revisados} revisados</span>
              <kbd className="glass rounded px-2 py-0.5 text-[10px] hidden sm:inline">SPACE</kbd>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progPercent}%`, background: "linear-gradient(90deg,#7c3aed,#6366f1,#60a5fa)", boxShadow: "0 0 10px rgba(139,92,246,0.5)" }} />
          </div>
        </div>

        {flashcardAtual?.origem === "erro" && (
          <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            ⚠️ Gerado de questão errada
          </div>
        )}

        {/* Modo edição */}
        {editando ? (
          <div className="glass-strong rounded-3xl p-5 mb-4 space-y-4 animate-scale-in" style={{ border: "1px solid rgba(139,92,246,0.2)" }}>
            <h3 className="text-sm font-bold text-white">Editar Flashcard</h3>
            <div>
              <label className="block text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Pergunta</label>
              <textarea
                value={draftFrente}
                onChange={(e) => setDraftFrente(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-success uppercase tracking-wider mb-2">Resposta</label>
              <textarea
                value={draftVerso}
                onChange={(e) => setDraftVerso(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-success/60 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditando(false)}
                className="flex-1 glass rounded-xl py-2.5 text-sm text-muted-foreground border border-white/10 hover:bg-white/5">
                Cancelar
              </button>
              <button onClick={handleSalvarEdicao} disabled={salvando}
                className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {salvando ? "Salvando…" : "✓ Salvar"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Card com flip — transform inline para máxima confiabilidade */}
            <div
              className="relative cursor-pointer"
              style={{ height: "260px", perspective: "1400px" }}
              onClick={handleFlip}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transformStyle: "preserve-3d",
                  transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  opacity,
                }}
              >
                {/* FRENTE */}
                <div
                  style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    borderRadius: "1.25rem",
                    border: "1px solid rgba(139,92,246,0.2)",
                    background: "rgba(20,18,40,0.85)",
                    backdropFilter: "blur(20px)",
                    display: "flex", flexDirection: "column",
                    padding: "1.5rem",
                    overflowY: "auto",
                  }}
                >
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                      {flashcardAtual?.assuntoTitulo}
                    </span>
                    <button
                      onClick={abrirEdicao}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                  {/* Texto scrollável em mobile */}
                  <div className="flex-1 overflow-y-auto">
                    <p className="text-base sm:text-lg text-white font-medium leading-relaxed">{flashcardAtual?.frente}</p>
                  </div>
                  {!flipped && (
                    <div className="flex justify-center mt-3 flex-shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5 animate-float">
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
                    borderRadius: "1.25rem",
                    border: "1px solid rgba(52,211,153,0.25)",
                    background: "linear-gradient(135deg, rgba(52,211,153,0.08), rgba(16,185,129,0.04))",
                    backdropFilter: "blur(20px)",
                    display: "flex", flexDirection: "column",
                    padding: "1.5rem",
                    overflowY: "auto",
                  }}
                >
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/15 border border-success/25 text-success text-xs font-medium">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Resposta
                    </span>
                    <button
                      onClick={abrirEdicao}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <p className="text-base text-white font-medium leading-relaxed">{flashcardAtual?.verso}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1 mt-4 mb-5">
              {Array.from({ length: Math.min(cardsLocais.length, 7) }, (_, i) => (
                <div key={i} className="h-1 rounded-full transition-all duration-300"
                  style={{ width: i === Math.min(indiceAtual, 6) ? "20px" : "6px", background: i === Math.min(indiceAtual, 6) ? "#a78bfa" : "rgba(255,255,255,0.15)" }} />
              ))}
            </div>

            {/* Rating */}
            <div className={`transition-all duration-400 ${flipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
              <p className="text-center text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Como foi?</p>
              <div className="flex gap-2 sm:gap-3">
                <RatingButton label="Errei" icon="😬" color="#f87171" glow="rgba(248,113,113,0.3)" onClick={() => handleAvaliacao(0)} delay={0} />
                <RatingButton label="Difícil" icon="😅" color="#fbbf24" glow="rgba(251,191,36,0.3)" onClick={() => handleAvaliacao(1)} delay={50} />
                <RatingButton label="Fácil" icon="😎" color="#34d399" glow="rgba(52,211,153,0.3)" onClick={() => handleAvaliacao(2)} delay={100} />
              </div>
            </div>
            {!flipped && <p className="text-center text-xs text-muted-foreground mt-4">Pense na resposta antes de virar o card</p>}
          </>
        )}
      </main>
    </div>
  );
};

// ---- Main Page ----
const Flashcards = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState<GrupoAssunto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoAssunto | null>(null);
  const [filtroPendentes, setFiltroPendentes] = useState(false);
  const [visible, setVisible] = useState(false);
  const [modoRevisao, setModoRevisao] = useState<ModoRevisao>("espacada");
  const [salvandoModo, setSalvandoModo] = useState(false);
  const [ordemGrupo, setOrdemGrupo] = useState<OrdemGrupo>("pendentes");

  useEffect(() => {
    if (!usuario) return;
    const carregar = async () => {
      try {
        const [todos, pendentes, perfil] = await Promise.all([
          buscarTodosFlashcardsDoUsuario(usuario.uid),
          buscarFlashcardsPendentes(usuario.uid),
          buscarPerfilUsuario(usuario.uid),
        ]);

        if (perfil?.modoRevisao) setModoRevisao(perfil.modoRevisao);
        const pendentesIds = new Set(pendentes.map((p) => p.id));

        const mapa = new Map<string, GrupoAssunto>();
        for (const fc of todos) {
          const chave = `${fc.materialId || "sem"}__${fc.assuntoId || "sem"}`;
          if (!mapa.has(chave)) {
            mapa.set(chave, {
              chave,
              materialId: fc.materialId || "",
              materialTitulo: fc.materialTitulo || "Sem material",
              assuntoId: fc.assuntoId || "",
              assuntoTitulo: fc.assuntoTitulo || "Geral",
              pendentes: 0, total: 0, cards: [],
            });
          }
          const g = mapa.get(chave)!;
          g.total++;
          g.cards.push(fc);
          if (pendentesIds.has(fc.id)) g.pendentes++;
        }

        setGrupos(Array.from(mapa.values()));
      } catch { /* silent */ }
      finally { setCarregando(false); setTimeout(() => setVisible(true), 100); }
    };
    carregar();
  }, [usuario]);

  const handleModoRevisao = async (modo: ModoRevisao) => {
    setModoRevisao(modo);
    if (!usuario) return;
    setSalvandoModo(true);
    try { await atualizarModoRevisao(usuario.uid, modo); }
    catch { /* silent */ }
    finally { setSalvandoModo(false); }
  };

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

  if (grupoSelecionado) {
    const agora = Date.now();
    const cards = filtroPendentes
      ? grupoSelecionado.cards.filter((c) => (c.proximaRevisao?.toMillis?.() ?? 0) <= agora)
      : grupoSelecionado.cards;

    if (cards.length === 0) {
      return (
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <span className="text-4xl">📭</span>
            <p className="text-muted-foreground">Nenhum flashcard pendente neste assunto.</p>
            <button onClick={() => setGrupoSelecionado(null)} className="text-violet-400 hover:underline text-sm">← Voltar</button>
          </div>
        </div>
      );
    }

    return <FlashcardSession cards={cards} grupo={grupoSelecionado} onVoltar={() => setGrupoSelecionado(null)} modoRevisao={modoRevisao} />;
  }

  const totalPendentes = grupos.reduce((acc, g) => acc + g.pendentes, 0);
  if (grupos.length === 0) return <EmptyState navigate={navigate} />;

  const materiaisUnicos = Array.from(new Map(grupos.map((g) => [g.materialId, g.materialTitulo])).entries());

  // Ordenar grupos
  const ordenarGrupos = (gs: GrupoAssunto[]) => {
    if (ordemGrupo === "pendentes") return [...gs].sort((a, b) => b.pendentes - a.pendentes);
    return [...gs].sort((a, b) => a.assuntoTitulo.localeCompare(b.assuntoTitulo));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <Navbar />

      <main className="relative mx-auto max-w-4xl px-4 pt-20 sm:pt-24 pb-16">
        {/* Header */}
        <div className={`mb-6 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <span className="text-xs font-medium text-violet-400 uppercase tracking-widest">Repetição</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2" style={{ fontFamily: "Syne, sans-serif" }}>Flashcards</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {totalPendentes > 0
              ? <><span className="text-yellow-400 font-semibold">{totalPendentes}</span> pendente{totalPendentes !== 1 ? "s" : ""} · {grupos.reduce((a, g) => a + g.total, 0)} total</>
              : "Todos em dia! 🎉"}
          </p>
        </div>

        {/* Seletor de modo */}
        <div className={`mb-4 transition-all duration-700 delay-100 ${visible ? "opacity-100" : "opacity-0"}`}>
          <div className="glass rounded-2xl p-4 border border-white/10">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Modo de Revisão</p>
            <div className="flex gap-2">
              {[
                { id: "espacada", label: "🧠 Espaçada (SM-2)", desc: "Intervalos crescentes", color: "violet" },
                { id: "diaria", label: "📅 Diária", desc: "Todos os dias", color: "blue" },
              ].map((m) => (
                <button key={m.id} onClick={() => handleModoRevisao(m.id as ModoRevisao)}
                  className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-medium transition-all border ${
                    modoRevisao === m.id
                      ? m.color === "violet" ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-blue-500/20 border-blue-500/40 text-blue-300"
                      : "border-white/10 text-muted-foreground hover:text-white"
                  }`}>
                  <span className="block">{m.label}</span>
                  <span className="block text-[9px] mt-0.5 opacity-60">{m.desc}</span>
                </button>
              ))}
            </div>
            {salvandoModo && <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Salvando...</p>}
          </div>
        </div>

        {/* Filtro + Ordem */}
        <div className={`flex flex-wrap gap-2 mb-6 transition-all duration-700 delay-150 ${visible ? "opacity-100" : "opacity-0"}`}>
          <button onClick={() => setFiltroPendentes(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${!filtroPendentes ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "border-white/10 text-muted-foreground hover:text-white"}`}>
            Todos
          </button>
          <button onClick={() => setFiltroPendentes(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border flex items-center gap-2 ${filtroPendentes ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" : "border-white/10 text-muted-foreground hover:text-white"}`}>
            Pendentes
            {totalPendentes > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/30 text-yellow-400 text-[10px] font-bold">{totalPendentes}</span>
            )}
          </button>

          <div className="w-px bg-white/10 self-stretch mx-1" />

          <button onClick={() => setOrdemGrupo("pendentes")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${ordemGrupo === "pendentes" ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "border-white/10 text-muted-foreground hover:text-white"}`}>
            ⚠ Por pendentes
          </button>
          <button onClick={() => setOrdemGrupo("alfabetica")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${ordemGrupo === "alfabetica" ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "border-white/10 text-muted-foreground hover:text-white"}`}>
            Az Alfabética
          </button>
        </div>

        {/* Grupos por material */}
        <div className="space-y-8">
          {materiaisUnicos.map(([materialId, materialTitulo]) => {
            const gruposMat = ordenarGrupos(grupos.filter((g) => g.materialId === materialId));
            const totalPendentesMat = gruposMat.reduce((a, g) => a + g.pendentes, 0);

            return (
              <div key={materialId}>
                {/* Header do material */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-sm shrink-0">📖</div>
                  <h2 className="text-sm font-bold text-white flex-1 min-w-0 truncate" style={{ fontFamily: "Syne, sans-serif" }}>{materialTitulo}</h2>
                  {totalPendentesMat > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold whitespace-nowrap">
                      {totalPendentesMat} pendente{totalPendentesMat !== 1 ? "s" : ""}
                    </span>
                  )}
                  {materialId && (
                    <button onClick={() => navigate(`/flashcards/material/${materialId}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border border-violet-500/25 bg-violet-500/8 text-violet-400 hover:bg-violet-500/18 hover:border-violet-500/45 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16" />
                      </svg>
                      Ver todos
                    </button>
                  )}
                </div>

                {/* Grid de assuntos */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {gruposMat.map((grupo, idx) => {
                    const hasPendentes = grupo.pendentes > 0;
                    const pct = grupo.total > 0 ? ((grupo.total - grupo.pendentes) / grupo.total) * 100 : 0;

                    return (
                      <div key={grupo.chave}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 hover:border-violet-500/40 cursor-pointer transition-all duration-300 card-hover opacity-0 animate-fade-in-up"
                        style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "forwards" }}
                        onClick={() => setGrupoSelecionado(grupo)}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(99,102,241,0.04))" }} />
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>🃏</div>
                              <h3 className="font-bold text-white text-sm leading-tight" style={{ fontFamily: "Syne, sans-serif" }}>
                                {grupo.assuntoTitulo}
                              </h3>
                            </div>
                            {hasPendentes && (
                              <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/25 text-yellow-400 text-[10px] font-bold shrink-0 animate-pulse">
                                {grupo.pendentes}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex gap-3">
                              <div className="text-center">
                                <p className="text-lg font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>{grupo.total}</p>
                                <p className="text-[9px] text-muted-foreground">Total</p>
                              </div>
                              <div className="w-px bg-white/10" />
                              <div className="text-center">
                                <p className="text-lg font-bold" style={{ color: hasPendentes ? "#fbbf24" : "#34d399", fontFamily: "Syne, sans-serif" }}>{grupo.pendentes}</p>
                                <p className="text-[9px] text-muted-foreground">Pendentes</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-violet-400">
                              <span className="text-xs font-medium">{hasPendentes ? "Revisar" : "Ver"}</span>
                              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>

                          <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: hasPendentes ? "linear-gradient(90deg,#fbbf24,#f59e0b)" : "linear-gradient(90deg,#34d399,#10b981)" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Flashcards;