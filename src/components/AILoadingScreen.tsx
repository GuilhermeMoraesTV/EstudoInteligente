import { useEffect, useState } from "react";

interface AILoadingScreenProps {
  progresso?: string;
  fase?: "extraindo" | "gerando" | "salvando" | "idle";
}

const fases = [
  { id: "extraindo", label: "Extraindo conhecimento", icon: "📖", color: "#60a5fa" },
  { id: "gerando", label: "IA processando conteúdo", icon: "🧠", color: "#a78bfa" },
  { id: "salvando", label: "Salvando seu progresso", icon: "💾", color: "#34d399" },
];

const dicas = [
  "A repetição espaçada aumenta a retenção em até 90%",
  "Estudar por 25 minutos com pausas é mais eficaz do que horas seguidas",
  "Questões de múltipla escolha ativam memória de reconhecimento",
  "Flashcards são ideais para memorizar conceitos-chave",
  "Estudar logo antes de dormir melhora a consolidação da memória",
  "Fazer perguntas durante o estudo acelera o aprendizado",
];

const AILoadingScreen = ({ progresso, fase = "gerando" }: AILoadingScreenProps) => {
  const [dica, setDica] = useState(0);
  const [dots, setDots] = useState(0);
  const [particles, setParticles] = useState<Array<{x: number, y: number, size: number, delay: number, color: string}>>([]);

  useEffect(() => {
    // Generate random particles
    const colors = ["#a78bfa", "#818cf8", "#60a5fa", "#34d399", "#fbbf24"];
    setParticles(Array.from({ length: 12 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    })));

    const dicaInterval = setInterval(() => {
      setDica((prev) => (prev + 1) % dicas.length);
    }, 3000);

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 400);

    return () => {
      clearInterval(dicaInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  const faseAtual = fases.findIndex((f) => f.id === fase);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay:'1s'}} />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `particle-float ${2 + p.delay}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            opacity: 0.6,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center max-w-lg">
        {/* Main AI orb */}
        <div className="relative">
          {/* Outer ring */}
          <div className="absolute inset-0 w-32 h-32 rounded-full border border-violet-500/20 animate-spin-slow" />
          <div className="absolute inset-2 w-28 h-28 rounded-full border border-indigo-500/20 animate-spin-slow" style={{animationDirection:'reverse', animationDuration:'6s'}} />

          {/* Orbiting dots */}
          <div className="orbit-container w-32 h-32">
            <div className="orbit-dot" />
            <div className="orbit-dot" />
            <div className="orbit-dot" />
          </div>

          {/* Center brain icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center animate-brain-pulse shadow-2xl"
              style={{ boxShadow: "0 0 40px rgba(139,92,246,0.6)" }}>
              <span className="text-2xl">🧠</span>
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gradient" style={{fontFamily:'Syne,sans-serif'}}>
            Processando com IA
            <span className="text-violet-400">{".".repeat(dots + 1)}</span>
          </h2>
          <p className="text-muted-foreground text-sm">
            {progresso || "Aguarde enquanto a IA trabalha para você"}
          </p>
        </div>

        {/* Progress steps */}
        <div className="w-full space-y-2">
          {fases.map((f, i) => {
            const isDone = i < faseAtual;
            const isActive = i === faseAtual;
            return (
              <div
                key={f.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                  isActive
                    ? "glass-strong border-violet-500/30 scale-[1.02]"
                    : isDone
                    ? "glass opacity-60"
                    : "opacity-30"
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                  isDone
                    ? "bg-success/20 text-success"
                    : isActive
                    ? "bg-violet-500/20 text-violet-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-3 h-3 rounded-full bg-violet-400 animate-pulse" />
                  ) : (
                    <span className="text-sm">{f.icon}</span>
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isDone ? "text-success" : isActive ? "text-white" : "text-muted-foreground"
                }`}>
                  {f.label}
                </span>
                {isActive && (
                  <div className="ml-auto flex gap-1">
                    <div className="ai-loading-dot" style={{background: f.color}} />
                    <div className="ai-loading-dot" style={{background: f.color}} />
                    <div className="ai-loading-dot" style={{background: f.color}} />
                  </div>
                )}
                {isDone && (
                  <span className="ml-auto text-xs text-success">Concluído</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Dica do dia */}
        <div className="glass rounded-2xl px-5 py-4 max-w-sm w-full">
          <p className="text-xs text-muted-foreground mb-1 font-medium tracking-wider uppercase">💡 Sabia que...</p>
          <p
            key={dica}
            className="text-sm text-foreground/80 animate-fade-in"
          >
            {dicas[dica]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AILoadingScreen;