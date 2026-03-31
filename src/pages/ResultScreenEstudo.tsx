// src/pages/ResultScreenEstudo.tsx
import { useEffect, useState } from "react";
import { gerarFeedbackDesempenho } from "../services/aiService";
import Navbar from "../components/Navbar";

interface ResultScreenProps {
  acertos: number;
  total: number;
  puladas: number;
  navigate: (p: string) => void;
  materialId: string;
  assuntoId: string;
  onContinuar: () => void;
}

const ResultScreen = ({ acertos, total, puladas, navigate, materialId, assuntoId, onContinuar }: ResultScreenProps) => {
  const taxa = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const [feedback, setFeedback] = useState("Analisando seu desempenho...");
  const [carregandoFeedback, setCarregandoFeedback] = useState(true);
  const size = 160;
  const radius = (size - 12) / 2;
  const circumference = radius * 2 * Math.PI;
  const color = taxa >= 70 ? "#34d399" : taxa >= 40 ? "#fbbf24" : "#f87171";
  const [animR, setAnimR] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimR(taxa), 400);
    setCarregandoFeedback(true);
    gerarFeedbackDesempenho(taxa, [])
      .then(setFeedback)
      .catch(() => setFeedback("Continue praticando! A consistência é o diferencial para a aprovação."))
      .finally(() => setCarregandoFeedback(false));
    return () => clearTimeout(t);
  }, [taxa]);

  const offset = circumference - (animR / 100) * circumference;

  const emoji = taxa >= 70 ? "🎉" : taxa >= 40 ? "💪" : "🔥";
  const mensagem = taxa >= 70 ? "Excelente desempenho!" : taxa >= 40 ? "Bom progresso!" : "Continue praticando!";

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />
      <Navbar />

      <main className="relative mx-auto max-w-2xl px-4 pt-24 pb-16">
        <div className="flex flex-col items-center gap-8">

          {/* Score Ring — SVG puro sem classe que gera quadrado */}
          <div className="animate-scale-in">
            <div
              className="relative flex items-center justify-center"
              style={{ width: size, height: size }}
            >
              <svg
                width={size}
                height={size}
                style={{ transform: "rotate(-90deg)", display: "block" }}
              >
                {/* Trilha de fundo */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="8"
                />
                {/* Arco de progresso */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{
                    transition: "stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)",
                    filter: `drop-shadow(0 0 16px ${color})`,
                  }}
                />
              </svg>
              {/* Texto central — absolutamente posicionado sobre o SVG */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                <span className="text-4xl font-bold" style={{ color, fontFamily: "Syne, sans-serif" }}>
                  {taxa}%
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">de acerto</span>
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="text-center animate-fade-in-up opacity-0" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Sessão Concluída! {emoji}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">{mensagem}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            {[
              { label: "Acertos", value: acertos, color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              )},
              { label: "Erros", value: total - acertos, color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              )},
              { label: "Respondidas", value: total, color: "#a78bfa", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              )},
              { label: "Puladas", value: puladas, color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              )},
            ].map((s, i) => (
              <div
                key={s.label}
                className="rounded-2xl p-4 text-center animate-fade-in-up opacity-0 flex flex-col items-center gap-2"
                style={{
                  animationDelay: `${300 + i * 80}ms`,
                  animationFillMode: "forwards",
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                }}
              >
                <span style={{ color: s.color }}>{s.icon}</span>
                <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: "Syne, sans-serif" }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Feedback IA */}
          <div
            className="w-full rounded-2xl p-5 animate-fade-in-up opacity-0"
            style={{
              animationDelay: "650ms",
              animationFillMode: "forwards",
              border: "1px solid rgba(139,92,246,0.2)",
              background: "rgba(139,92,246,0.06)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-sm animate-brain-pulse">🧠</div>
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Feedback da IA</span>
            </div>
            {carregandoFeedback ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="ai-loading-dot" />
                  <div className="ai-loading-dot" />
                  <div className="ai-loading-dot" />
                </div>
                <span className="text-xs text-muted-foreground">Analisando desempenho...</span>
              </div>
            ) : (
              <p className="text-sm text-white/80 leading-relaxed">{feedback}</p>
            )}
          </div>

          {/* Botões de ação — 3 botões */}
          <div
            className="flex flex-col sm:flex-row gap-3 w-full animate-fade-in-up opacity-0"
            style={{ animationDelay: "750ms", animationFillMode: "forwards" }}
          >
            {/* Voltar aos Assuntos */}
            <button
              onClick={() => navigate(`/estudos/${materialId}`)}
              className="flex-1 flex items-center justify-center gap-2 glass rounded-2xl py-3 text-sm font-semibold text-white border border-white/10 hover:bg-white/5 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Assuntos
            </button>

            {/* Revisar Flashcards */}
            <button
              onClick={() => navigate("/flashcards")}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all"
              style={{
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.3)",
                color: "#818cf8",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.12)")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" />
              </svg>
              Revisar Flashcards
            </button>

            {/* Continuar estudando */}
            <button
              onClick={onContinuar}
              className="flex-1 btn-primary rounded-2xl py-3 text-sm font-bold text-white flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Continuar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResultScreen;