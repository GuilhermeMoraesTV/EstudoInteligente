import { useState, useEffect } from "react";
import { gerarFeedbackDesempenho } from "../services/aiService";

interface SmartFeedbackProps {
  taxaAcerto: number;
  temasErrados: string[];
  visivel: boolean;
  onFechar: () => void;
}

const SmartFeedback = ({ taxaAcerto, temasErrados, visivel, onFechar }: SmartFeedbackProps) => {
  const [feedback, setFeedback] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (visivel) {
      setCarregando(true);
      gerarFeedbackDesempenho(taxaAcerto, temasErrados)
        .then(setFeedback)
        .catch(() => setFeedback("Continue praticando! A consistência é essencial para a aprovação."))
        .finally(() => setCarregando(false));
    }
  }, [visivel, taxaAcerto, temasErrados]);

  if (!visivel) return null;

  const color = taxaAcerto >= 70 ? "#34d399" : taxaAcerto >= 40 ? "#fbbf24" : "#f87171";
  const glow = taxaAcerto >= 70 ? "rgba(52,211,153,0.2)" : taxaAcerto >= 40 ? "rgba(251,191,36,0.2)" : "rgba(248,113,113,0.2)";
  const emoji = taxaAcerto >= 70 ? "🎉" : taxaAcerto >= 40 ? "💪" : "🔥";

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-slide-in-right">
      <div
        className="glass-strong rounded-2xl p-5 shadow-2xl"
        style={{ border: `1px solid ${color}25`, boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${glow}` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">🧠</div>
            <span className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Feedback da IA
            </span>
          </div>
          <button
            onClick={onFechar}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Score bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground">Taxa de acerto</span>
            <span className="text-sm font-bold" style={{ color }}>{emoji} {taxaAcerto}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${taxaAcerto}%`,
                background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                boxShadow: `0 0 8px ${color}80`,
              }}
            />
          </div>
        </div>

        {/* Feedback text */}
        {carregando ? (
          <div className="flex items-center gap-2 py-2">
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

        <button
          onClick={onFechar}
          className="mt-4 w-full py-2 rounded-xl text-xs font-semibold text-white transition-all"
          style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}
        >
          Entendido ✓
        </button>
      </div>
    </div>
  );
};

export default SmartFeedback;