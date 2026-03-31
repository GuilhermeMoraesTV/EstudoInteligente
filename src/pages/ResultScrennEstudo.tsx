// ─── Tela de resultado — versão corrigida para Estudo.tsx ────────────────────
// Substitua o componente ResultScreen em src/pages/Estudo.tsx pelo código abaixo

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
  const [feedback, setFeedback] = useState("Analisando...");
  const size = 160;
  const radius = (size - 12) / 2;
  const circumference = radius * 2 * Math.PI;
  const color = taxa >= 70 ? "#34d399" : taxa >= 40 ? "#fbbf24" : "#f87171";
  const [animR, setAnimR] = useState(0);

  useEffect(() => {
    setTimeout(() => setAnimR(taxa), 400);
    gerarFeedbackDesempenho(taxa, [])
      .then(setFeedback)
      .catch(() => setFeedback("Continue praticando!"));
  }, [taxa]);

  const offset = circumference - (animR / 100) * circumference;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <Navbar />
      <main className="relative mx-auto max-w-2xl px-4 pt-24 pb-16">
        <div className="flex flex-col items-center gap-8">

          {/* Anel de pontuação — SEM classe score-ring que causava quadrado */}
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg
              width={size}
              height={size}
              style={{ transform: "rotate(-90deg)", display: "block" }}
            >
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)", filter: `drop-shadow(0 0 16px ${color})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ color, fontFamily: "Syne, sans-serif" }}>{taxa}%</span>
              <span className="text-xs text-muted-foreground">de acerto</span>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Sessão Concluída!</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {taxa >= 70 ? "Excelente! 🎉" : taxa >= 40 ? "Bom progresso! 💪" : "Continue praticando! 🔥"}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            {[
              { label: "Acertos", value: acertos, color: "#34d399", icon: "✅" },
              { label: "Erros", value: total - acertos, color: "#f87171", icon: "❌" },
              { label: "Respondidas", value: total, color: "#a78bfa", icon: "📊" },
              { label: "Puladas", value: puladas, color: "#fbbf24", icon: "⏭️" },
            ].map((s, i) => (
              <div key={s.label}
                className="glass rounded-2xl p-4 text-center animate-fade-in-up opacity-0"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "forwards", borderColor: `${s.color}20` }}>
                <span className="text-xl">{s.icon}</span>
                <p className="text-2xl font-bold mt-1" style={{ color: s.color, fontFamily: "Syne, sans-serif" }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Feedback IA */}
          <div className="w-full glass rounded-2xl p-5" style={{ border: "1px solid rgba(139,92,246,0.2)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-xs">🧠</div>
              <span className="text-xs font-semibold text-violet-400">Feedback da IA</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{feedback}</p>
          </div>

          {/* Ações — 3 botões incluindo Revisar Flashcards */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => navigate(`/estudos/${materialId}`)}
              className="flex-1 glass rounded-2xl py-3 text-sm font-semibold text-white border border-white/10 hover:bg-white/5 transition-all"
            >
              ← Assuntos
            </button>
            <button
              onClick={() => navigate("/flashcards")}
              className="flex-1 glass rounded-2xl py-3 text-sm font-semibold border transition-all flex items-center justify-center gap-2"
              style={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)", color: "#a78bfa" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.08)")}
            >
              🃏 <span>Revisar Flashcards</span>
            </button>
            <button
              onClick={onContinuar}
              className="flex-1 btn-primary rounded-2xl py-3 text-sm font-bold text-white flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              <span>Continuar</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResultScreen;