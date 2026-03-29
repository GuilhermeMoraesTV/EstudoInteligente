import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { buscarFlashcardsPendentes, atualizarFlashcard, registrarResposta, Flashcard } from "../services/firebaseService";
import Navbar from "../components/Navbar";

// Empty state
const EmptyState = ({ navigate }: { navigate: (p: string) => void }) => (
  <div className="min-h-screen bg-background">
    <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
    <Navbar />
    <div className="relative flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center text-5xl animate-float">
        🃏
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Nenhum flashcard pendente</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Envie um material de estudo para gerar flashcards, ou aguarde a próxima data de revisão.
        </p>
      </div>
      <button
        onClick={() => navigate("/upload")}
        className="btn-primary px-6 py-3 rounded-2xl text-sm font-bold text-white"
        style={{ fontFamily: "Syne, sans-serif" }}
      >
        🚀 Novo Estudo
      </button>
    </div>
  </div>
);

// Complete state
const CompleteState = ({ revisados, navigate }: { revisados: number; navigate: (p: string) => void }) => (
  <div className="min-h-screen bg-background">
    <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-[600px] h-[600px] bg-success/5 rounded-full blur-[150px]" />
    </div>
    <Navbar />
    <div className="relative flex flex-col items-center justify-center min-h-screen gap-8 px-4 text-center">
      <div className="relative">
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-success/20 to-emerald-600/20 border border-success/30 flex items-center justify-center text-5xl animate-float"
          style={{ boxShadow: "0 0 50px rgba(52,211,153,0.2)" }}>
          🎉
        </div>
        {/* Confetti dots */}
        {["#34d399","#a78bfa","#60a5fa","#fbbf24","#f87171"].map((c,i) => (
          <div key={i} className="absolute w-2 h-2 rounded-full animate-float"
            style={{
              background: c,
              top: `${Math.random()*100}%`,
              left: `${Math.random()*100}%`,
              animationDelay: `${i*0.3}s`,
              animationDuration: `${2+i*0.5}s`,
            }} />
        ))}
      </div>
      <div>
        <h2 className="text-3xl font-bold text-gradient" style={{ fontFamily: "Syne, sans-serif" }}>
          Revisão Concluída!
        </h2>
        <p className="mt-3 text-muted-foreground">
          Você revisou <span className="text-success font-bold">{revisados}</span> flashcard{revisados !== 1 ? "s" : ""} nesta sessão.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Ótimo trabalho! Seus intervalos foram atualizados.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => navigate("/")}
          className="glass px-5 py-3 rounded-2xl text-sm font-semibold text-white border border-white/10 hover:bg-white/5 transition-all">
          ← Dashboard
        </button>
        <button onClick={() => navigate("/upload")}
          className="btn-primary px-5 py-3 rounded-2xl text-sm font-bold text-white"
          style={{ fontFamily: "Syne, sans-serif" }}>
          📚 Novo Estudo
        </button>
      </div>
    </div>
  </div>
);

// Rating button
const RatingButton = ({
  label, icon, color, glow, onClick, delay
}: {
  label: string; icon: string; color: string; glow: string; onClick: () => void; delay: number;
}) => (
  <button
    onClick={onClick}
    className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all duration-300 hover:scale-105 active:scale-95 animate-fade-in-up opacity-0"
    style={{
      animationDelay: `${delay}ms`,
      animationFillMode: "forwards",
      borderColor: `${color}30`,
      background: `${color}08`,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 20px ${glow}`)}
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}
  >
    <span className="text-2xl">{icon}</span>
    <span className="text-xs font-semibold" style={{ color }}>{label}</span>
  </button>
);

const Flashcards = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [revisados, setRevisados] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    const carregar = async () => {
      try {
        const dados = await buscarFlashcardsPendentes(usuario.uid);
        setFlashcards(dados);
      } catch {
        setErro("Erro ao carregar flashcards.");
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [usuario]);

  const flashcardAtual = flashcards[indiceAtual];

  const handleFlip = useCallback(() => {
    if (!transitioning) setFlipped((prev) => !prev);
  }, [transitioning]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); handleFlip(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleFlip]);

  const handleAvaliacao = async (qualidade: number) => {
    if (!usuario || !flashcardAtual?.id || transitioning) return;
    setTransitioning(true);

    try {
      await atualizarFlashcard(flashcardAtual.id, qualidade);
      await registrarResposta(usuario.uid, "flashcard", flashcardAtual.id, qualidade > 0, 0);
    } catch { /* silent */ }

    setRevisados((prev) => prev + 1);

    // Animate out
    setTimeout(() => {
      setFlipped(false);
      setTimeout(() => {
        setIndiceAtual((prev) => prev + 1);
        setTransitioning(false);
      }, 350);
    }, 150);
  };

  if (carregando) return (
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

  if (erro) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Navbar />
      <p className="text-destructive">{erro}</p>
    </div>
  );

  if (flashcards.length === 0) return <EmptyState navigate={navigate} />;
  if (indiceAtual >= flashcards.length) return <CompleteState revisados={revisados} navigate={navigate} />;

  const progPercent = (indiceAtual / flashcards.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-15 pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <main className="relative mx-auto max-w-xl px-4 pt-24 pb-16">
        {/* Progress */}
        <div className="mb-6 animate-fade-in-down">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="glass rounded-lg px-3 py-1 font-mono font-bold text-violet-400">
              {indiceAtual + 1}/{flashcards.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{revisados} revisados</span>
              <kbd className="glass rounded px-2 py-0.5 text-[10px] text-muted-foreground">SPACE</kbd>
              <span className="text-[10px] text-muted-foreground">para virar</span>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progPercent}%`,
                background: "linear-gradient(90deg,#7c3aed,#6366f1,#60a5fa)",
                boxShadow: "0 0 10px rgba(139,92,246,0.5)",
              }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="flashcard-container" style={{ height: "280px" }}>
          <div
            className={`flashcard-inner ${flipped ? "flipped" : ""} cursor-pointer`}
            onClick={handleFlip}
            style={{ height: "280px", opacity: transitioning ? 0 : 1, transition: "opacity 0.2s ease, transform 0.7s cubic-bezier(0.4,0,0.2,1)" }}
          >
            {/* Front */}
            <div className="flashcard-front glass-strong flex flex-col items-center justify-center p-8 text-center"
              style={{ border: "1px solid rgba(139,92,246,0.2)", background: "rgba(20,18,40,0.8)" }}>
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Conceito
                </span>
              </div>
              <p className="text-lg text-white font-medium leading-relaxed">
                {flashcardAtual?.frente}
              </p>
              {!flipped && (
                <div className="absolute bottom-5 left-0 right-0 flex justify-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 animate-float">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    Clique para revelar
                  </span>
                </div>
              )}
            </div>

            {/* Back */}
            <div className="flashcard-back flex flex-col items-center justify-center p-8 text-center"
              style={{
                border: "1px solid rgba(52,211,153,0.25)",
                background: "linear-gradient(135deg, rgba(52,211,153,0.08), rgba(16,185,129,0.04))",
                backdropFilter: "blur(20px)",
              }}>
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/15 border border-success/25 text-success text-xs font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Resposta
                </span>
              </div>
              <p className="text-lg text-white font-medium leading-relaxed">
                {flashcardAtual?.verso}
              </p>
            </div>
          </div>
        </div>

        {/* Card counter dots */}
        <div className="flex justify-center gap-1 mt-4 mb-6">
          {Array.from({ length: Math.min(flashcards.length, 7) }, (_, i) => {
            const actualIndex = flashcards.length <= 7 ? i : Math.floor((i / 6) * (flashcards.length - 1));
            return (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === Math.min(indiceAtual, 6) ? "20px" : "6px",
                  background: i === Math.min(indiceAtual, 6) ? "#a78bfa" : "rgba(255,255,255,0.15)",
                }}
              />
            );
          })}
        </div>

        {/* Rating buttons (only when flipped) */}
        <div className={`transition-all duration-500 ${flipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
          <p className="text-center text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">
            Como foi sua resposta?
          </p>
          <div className="flex gap-3">
            <RatingButton
              label="Errei" icon="😬" color="#f87171" glow="rgba(248,113,113,0.3)"
              onClick={() => handleAvaliacao(0)} delay={0}
            />
            <RatingButton
              label="Difícil" icon="😅" color="#fbbf24" glow="rgba(251,191,36,0.3)"
              onClick={() => handleAvaliacao(1)} delay={50}
            />
            <RatingButton
              label="Fácil" icon="😎" color="#34d399" glow="rgba(52,211,153,0.3)"
              onClick={() => handleAvaliacao(2)} delay={100}
            />
          </div>
        </div>

        {/* Hint when not flipped */}
        {!flipped && (
          <div className="text-center animate-fade-in">
            <p className="text-xs text-muted-foreground">
              Pense na resposta antes de virar o card
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Flashcards;