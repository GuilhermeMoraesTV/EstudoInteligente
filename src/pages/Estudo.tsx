import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { buscarQuestoesPorMaterial, registrarResposta, Questao } from "../services/firebaseService";
import { gerarFeedbackDesempenho } from "../services/aiService";
import Navbar from "../components/Navbar";

// Animated loading
const LoadingQuestions = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border-2 border-indigo-500/20 animate-spin-slow" style={{animationDirection:"reverse"}} />
        <div className="absolute inset-0 flex items-center justify-center text-3xl animate-brain-pulse">✏️</div>
      </div>
      <p className="text-white font-semibold" style={{fontFamily:"Syne,sans-serif"}}>Carregando questões...</p>
      <p className="text-muted-foreground text-sm">Preparando sua sessão de estudo</p>
    </div>
  </div>
);

// Result Screen
const ResultScreen = ({
  acertos,
  total,
  temasErrados,
  navigate,
}: {
  acertos: number;
  total: number;
  temasErrados: string[];
  navigate: (path: string) => void;
}) => {
  const taxa = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const [feedback, setFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [animRadius, setAnimRadius] = useState(0);
  const [visible, setVisible] = useState(false);

  const size = 160;
  const radius = (size - 12) / 2;
  const circumference = radius * 2 * Math.PI;
  const color = taxa >= 70 ? "#34d399" : taxa >= 40 ? "#fbbf24" : "#f87171";

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    setTimeout(() => setAnimRadius(taxa), 400);
    gerarFeedbackDesempenho(taxa, temasErrados)
      .then(setFeedback)
      .catch(() => setFeedback("Continue praticando! A consistência é a chave para a aprovação."))
      .finally(() => setFeedbackLoading(false));
  }, [taxa, temasErrados]);

  const offset = circumference - (animRadius / 100) * circumference;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none"
        style={{ background: `${color}10` }} />
      <Navbar />
      <main className="relative mx-auto max-w-2xl px-4 pt-24 pb-16">
        <div className={`flex flex-col items-center gap-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Score circle */}
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="score-ring">
              <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle
                cx={size/2} cy={size/2} r={radius} fill="none"
                stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)", filter: `drop-shadow(0 0 16px ${color})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ color, fontFamily: "Syne, sans-serif" }}>{taxa}%</span>
              <span className="text-xs text-muted-foreground">de acerto</span>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Sessão Concluída!
            </h1>
            <p className="text-muted-foreground mt-2">
              {taxa >= 70 ? "Excelente desempenho! 🎉" : taxa >= 40 ? "Bom progresso! Continue assim 💪" : "Não desanime! A prática leva à perfeição 🔥"}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 w-full">
            {[
              { label: "Acertos", value: acertos, color: "#34d399", icon: "✅" },
              { label: "Erros", value: total - acertos, color: "#f87171", icon: "❌" },
              { label: "Total", value: total, color: "#a78bfa", icon: "📊" },
            ].map((s, i) => (
              <div
                key={s.label}
                className="glass rounded-2xl p-5 text-center animate-fade-in-up opacity-0"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: "forwards", borderColor: `${s.color}20` }}
              >
                <span className="text-2xl">{s.icon}</span>
                <p className="text-2xl font-bold mt-2" style={{ color: s.color, fontFamily: "Syne, sans-serif" }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* AI Feedback */}
          <div className="w-full glass rounded-2xl p-6 border border-violet-500/20 animate-fade-in-up opacity-0" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">🧠</div>
              <span className="text-sm font-semibold text-violet-400">Feedback da IA</span>
              {feedbackLoading && (
                <div className="flex gap-1 ml-2">
                  <div className="ai-loading-dot w-1.5 h-1.5" />
                  <div className="ai-loading-dot w-1.5 h-1.5" />
                  <div className="ai-loading-dot w-1.5 h-1.5" />
                </div>
              )}
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              {feedbackLoading ? "Analisando seu desempenho..." : feedback}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={() => navigate("/")}
              className="flex-1 glass rounded-2xl py-3.5 text-sm font-semibold text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => navigate("/flashcards")}
              className="flex-1 btn-primary rounded-2xl py-3.5 text-sm font-bold text-white"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              🃏 Revisar Flashcards
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

// Option button
const OptionButton = ({
  alternativa,
  index,
  respondida,
  selecionada,
  correta,
  onSelect,
}: {
  alternativa: string;
  index: number;
  respondida: boolean;
  selecionada: string | null;
  correta: string;
  onSelect: (alt: string) => void;
}) => {
  const letters = ["A", "B", "C", "D", "E"];
  const letter = letters[index];
  const isSelected = alternativa === selecionada;
  const isCorrect = alternativa === correta;

  let statusClass = "";
  let letterClass = "bg-white/10 text-white/60";
  let borderClass = "border-white/10 hover:border-violet-500/40 hover:bg-white/5";

  if (respondida) {
    if (isCorrect) {
      statusClass = "bg-success/10";
      borderClass = "border-success/40";
      letterClass = "bg-success/20 text-success";
    } else if (isSelected && !isCorrect) {
      statusClass = "bg-destructive/10";
      borderClass = "border-destructive/40";
      letterClass = "bg-destructive/20 text-destructive";
    } else {
      statusClass = "opacity-40";
      borderClass = "border-white/5";
    }
  } else if (isSelected) {
    borderClass = "border-violet-500/60 bg-violet-500/10";
    letterClass = "bg-violet-500/30 text-violet-300";
  }

  return (
    <button
      onClick={() => !respondida && onSelect(alternativa)}
      disabled={respondida}
      className={`question-option w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-250 text-left ${statusClass} ${borderClass} ${respondida ? "cursor-default" : "cursor-pointer"} animate-fade-in-up opacity-0`}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "forwards" }}
    >
      <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${letterClass}`}>
        {letter}
      </span>
      <span className="text-sm leading-snug flex-1" style={{ color: respondida && !isCorrect && !isSelected ? undefined : respondida && isCorrect ? "#34d399" : respondida && isSelected ? "#f87171" : undefined }}>
        {alternativa}
      </span>
      {respondida && isCorrect && (
        <span className="text-success shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      {respondida && isSelected && !isCorrect && (
        <span className="text-destructive shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      )}
    </button>
  );
};

const Estudo = () => {
  const { materialId } = useParams<{ materialId: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | null>(null);
  const [respondida, setRespondida] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [acertos, setAcertos] = useState(0);
  const [totalRespondidas, setTotalRespondidas] = useState(0);
  const [temasErrados, setTemasErrados] = useState<string[]>([]);
  const [sessaoFinalizada, setSessaoFinalizada] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const tempoInicio = useRef<number>(Date.now());

  useEffect(() => {
    if (!usuario || !materialId) return;
    const carregar = async () => {
      try {
        const dados = await buscarQuestoesPorMaterial(usuario.uid, materialId);
        if (dados.length === 0) setErro("Nenhuma questão encontrada para este material.");
        setQuestoes(dados);
      } catch {
        setErro("Erro ao carregar as questões.");
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [usuario, materialId]);

  useEffect(() => {
    tempoInicio.current = Date.now();
    setShowExplanation(false);
  }, [indiceAtual]);

  const questaoAtual = questoes[indiceAtual];

  const handleResponder = async (alternativa: string) => {
    if (respondida || !usuario || !questaoAtual?.id) return;
    setRespostaSelecionada(alternativa);
    setRespondida(true);
    const tempoGasto = Math.round((Date.now() - tempoInicio.current) / 1000);
    const acertou = alternativa === questaoAtual.correta;
    if (acertou) setAcertos((prev) => prev + 1);
    else setTemasErrados((prev) => [...prev, questaoAtual.pergunta.substring(0, 60)]);
    setTotalRespondidas((prev) => prev + 1);
    setTimeout(() => setShowExplanation(true), 300);
    try {
      await registrarResposta(usuario.uid, "questao", questaoAtual.id, acertou, tempoGasto);
    } catch { /* silent */ }
  };

  const handleProxima = () => {
    if (indiceAtual < questoes.length - 1) {
      setIndiceAtual((prev) => prev + 1);
      setRespostaSelecionada(null);
      setRespondida(false);
    } else {
      setSessaoFinalizada(true);
    }
  };

  if (carregando) return <LoadingQuestions />;

  if (erro) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Navbar />
      <span className="text-4xl">😕</span>
      <p className="text-destructive text-sm">{erro}</p>
      <button onClick={() => navigate("/")} className="text-violet-400 hover:underline text-sm">← Voltar ao início</button>
    </div>
  );

  if (sessaoFinalizada) return (
    <ResultScreen acertos={acertos} total={totalRespondidas} temasErrados={temasErrados} navigate={navigate} />
  );

  const progPercent = questoes.length > 0 ? ((indiceAtual + (respondida ? 1 : 0)) / questoes.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-15 pointer-events-none" />
      <Navbar />

      <main className="relative mx-auto max-w-2xl px-4 pt-24 pb-16">
        {/* Progress header */}
        <div className="mb-6 animate-fade-in-down">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-3">
              <span className="glass rounded-lg px-3 py-1 text-violet-400 font-mono font-bold">
                {indiceAtual + 1}/{questoes.length}
              </span>
              <span>Questões respondidas</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="text-success">✓</span>
                <span className="text-success font-semibold">{acertos}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-destructive">✗</span>
                <span className="text-destructive font-semibold">{totalRespondidas - acertos}</span>
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full progress-bar-animated transition-all duration-700"
              style={{
                width: `${progPercent}%`,
                background: "linear-gradient(90deg, #7c3aed, #6366f1, #60a5fa)",
                boxShadow: "0 0 10px rgba(139,92,246,0.5)",
              }}
            />
          </div>
        </div>

        {/* Question card */}
        <div
          key={indiceAtual}
          className="glass-strong rounded-3xl p-7 mb-5 animate-scale-in"
          style={{ border: "1px solid rgba(139,92,246,0.15)" }}
        >
          {/* Question badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Questão {indiceAtual + 1}
            </span>
          </div>

          {/* Question text */}
          <h2 className="text-base leading-relaxed text-white/95 font-medium mb-6" style={{ lineHeight: "1.7" }}>
            {questaoAtual?.pergunta}
          </h2>

          {/* Options */}
          <div className="space-y-2.5">
            {questaoAtual?.alternativas.map((alt, i) => (
              <OptionButton
                key={i}
                alternativa={alt}
                index={i}
                respondida={respondida}
                selecionada={respostaSelecionada}
                correta={questaoAtual.correta}
                onSelect={handleResponder}
              />
            ))}
          </div>
        </div>

        {/* Explanation */}
        {respondida && showExplanation && (
          <div className="glass rounded-2xl p-5 mb-5 animate-fade-in-up border border-violet-500/15">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-xs">💡</div>
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Explicação</span>
            </div>
            <p className="text-sm leading-relaxed text-white/80">{questaoAtual?.explicacao}</p>
          </div>
        )}

        {/* Next button */}
        {respondida && (
          <button
            onClick={handleProxima}
            className="btn-primary w-full rounded-2xl py-4 text-sm font-bold text-white animate-fade-in-up"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            {indiceAtual < questoes.length - 1 ? (
              <span className="flex items-center justify-center gap-2">
                Próxima questão
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🏁 Ver Resultado
              </span>
            )}
          </button>
        )}
      </main>
    </div>
  );
};

export default Estudo;