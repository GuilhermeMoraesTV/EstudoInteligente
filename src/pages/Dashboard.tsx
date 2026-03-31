import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { calcularEstatisticas } from "../services/firebaseService";
import Navbar from "../components/Navbar";

interface Estatisticas {
  totalMateriais: number;
  totalRespostas: number;
  taxaAcerto: number;
  taxaAcertoQuestoes: number;
  flashcardsPendentes: number;
}

const useCounter = (target: number, duration = 1500) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
};

// Score Ring corrigido — sem fundo SVG ou classe que causa quadrado
const ScoreRing = ({ value, size = 80 }: { value: number; size?: number }) => {
  const radius = (size - 10) / 2;
  const circumference = radius * 2 * Math.PI;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const offset = circumference - (animated / 100) * circumference;
  const color = value >= 70 ? "#34d399" : value >= 40 ? "#fbbf24" : "#f87171";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)",
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      </svg>
    </div>
  );
};

const StatCard = ({ label, value, icon, color, suffix = "", delay = 0 }: {
  label: string; value: number; icon: string; color: string; suffix?: string; delay?: number;
}) => {
  const count = useCounter(value);
  return (
    <div className="stat-card glass rounded-2xl p-5 card-hover opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards", borderColor: `${color}20` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif", color }}>{count}</span>
        {suffix && <span className="text-lg font-bold mb-0.5" style={{ color }}>{suffix}</span>}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    const carregar = async () => {
      try {
        const dados = await calcularEstatisticas(usuario.uid);
        setStats(dados);
      } catch { /* silent */ }
      finally { setCarregando(false); setTimeout(() => setVisible(true), 100); }
    };
    carregar();
  }, [usuario]);

  const userName = usuario?.email?.split("@")[0] || "Estudante";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const taxaAcerto = stats?.taxaAcerto ?? 0;
  const taxaColor = taxaAcerto >= 70 ? "#34d399" : taxaAcerto >= 40 ? "#fbbf24" : "#f87171";

  if (carregando) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-spin-slow" />
            <div className="absolute inset-2 rounded-full border-2 border-indigo-500/20 animate-spin-slow" style={{ animationDirection: "reverse" }} />
            <div className="absolute inset-0 flex items-center justify-center text-2xl animate-brain-pulse">🧠</div>
          </div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />
      <Navbar />

      <main className="relative mx-auto max-w-6xl px-4 pt-24 pb-16">
        {/* Header */}
        <div className={`mb-10 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl animate-float">👋</span>
            <span className="text-sm text-muted-foreground font-medium">{greeting},</span>
          </div>
          <h1 className="text-4xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
            <span className="text-gradient">{userName}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Pronto para mais um dia de estudos?</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Materiais" value={stats?.totalMateriais ?? 0} icon="📚" color="#a78bfa" delay={0} />
          <StatCard label="Questões" value={stats?.totalRespostas ?? 0} icon="✏️" color="#60a5fa" delay={100} />

          {/* Taxa de acerto — card customizado com ScoreRing corrigido */}
          <div className="stat-card glass rounded-2xl p-5 card-hover opacity-0 animate-fade-in-up col-span-1"
            style={{ animationDelay: "200ms", animationFillMode: "forwards", borderColor: `${taxaColor}20` }}>
            <div className="flex items-start justify-between mb-2">
              <ScoreRing value={taxaAcerto} />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-right">Taxa de<br />Acerto</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: taxaColor }}>
                {taxaAcerto}
              </span>
              <span className="text-lg font-bold" style={{ color: taxaColor }}>%</span>
            </div>
          </div>

          <StatCard label="Flashcards Pendentes" value={stats?.flashcardsPendentes ?? 0} icon="🃏"
            color={(stats?.flashcardsPendentes ?? 0) > 0 ? "#fbbf24" : "#34d399"} delay={300} />
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ações Rápidas</h2>

            <button onClick={() => navigate("/estudos")}
              className="w-full text-left relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group border border-violet-500/20 hover:border-violet-500/50"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(99,102,241,0.08) 100%)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(99,102,241,0.12) 100%)" }} />
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity"><span className="text-7xl">✦</span></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">📚</div>
                  <span className="font-semibold text-white text-lg" style={{ fontFamily: "Syne, sans-serif" }}>Meus Estudos</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">Acesse seus materiais salvos, retome um assunto ou adicione novo conteúdo para estudar.</p>
                <div className="mt-4 flex items-center gap-2 text-violet-400 text-sm font-medium">
                  <span>Ver materiais</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            <button onClick={() => navigate("/upload")}
              className="w-full text-left relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group border border-indigo-500/20 hover:border-indigo-500/50"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(59,130,246,0.06) 100%)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(59,130,246,0.1))" }} />
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-lg group-hover:scale-110 transition-transform shrink-0">🚀</div>
                <div>
                  <span className="font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Novo Estudo com IA</span>
                  <p className="text-sm text-muted-foreground mt-1">Upload PDF ou cole texto — a IA identifica assuntos e gera questões automaticamente.</p>
                  <div className="mt-3 flex items-center gap-2 text-indigo-400 text-sm font-medium">
                    <span>Começar</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>

            <button onClick={() => navigate("/flashcards")}
              className="w-full text-left relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group border border-blue-500/20 hover:border-blue-500/50"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.06) 100%)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(99,102,241,0.1))" }} />
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-lg group-hover:scale-110 transition-transform shrink-0">🃏</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Revisar Flashcards</span>
                    {(stats?.flashcardsPendentes ?? 0) > 0 && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-bold animate-pulse">
                        {stats?.flashcardsPendentes}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(stats?.flashcardsPendentes ?? 0) > 0
                      ? `${stats?.flashcardsPendentes} flashcard${stats!.flashcardsPendentes > 1 ? "s" : ""} aguardando revisão`
                      : "Nenhum flashcard pendente. Continue estudando!"}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-blue-400 text-sm font-medium">
                    <span>Revisar agora</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Conquistas</h2>
            <div className="glass rounded-2xl p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
              <div className="space-y-2">
                {[
                  { label: "Primeiro material", done: (stats?.totalMateriais ?? 0) >= 1, icon: "📚" },
                  { label: "10 questões respondidas", done: (stats?.totalRespostas ?? 0) >= 10, icon: "✏️" },
                  { label: "70% de acerto", done: (stats?.taxaAcerto ?? 0) >= 70, icon: "🎯" },
                  { label: "5 materiais", done: (stats?.totalMateriais ?? 0) >= 5, icon: "🏆" },
                  { label: "50 questões", done: (stats?.totalRespostas ?? 0) >= 50, icon: "⚡" },
                ].map((a) => (
                  <div key={a.label} className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-all ${a.done ? "bg-success/10 border border-success/20" : "bg-white/3 border border-white/5"}`}>
                    <span className={a.done ? "" : "grayscale opacity-40"}>{a.icon}</span>
                    <span className={`text-xs ${a.done ? "text-success font-medium" : "text-muted-foreground"}`}>{a.label}</span>
                    {a.done && (
                      <span className="ml-auto text-success">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-5 opacity-0 animate-fade-in-up border border-yellow-500/20"
              style={{ animationDelay: "500ms", animationFillMode: "forwards", background: "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04))" }}>
              <p className="text-xs text-yellow-500/80 font-medium uppercase tracking-wider mb-2">💡 Dica</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Revise flashcards todo dia pela manhã. A consistência diária supera sessões longas esporádicas.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;