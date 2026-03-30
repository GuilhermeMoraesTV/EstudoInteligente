import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  buscarMaterialPorId, buscarQuestoesPorAssunto,
  salvarQuestoes, salvarFlashcards, registrarResposta,
  Material, Questao, AssuntoSalvo
} from "../services/firebaseService";
import { gerarConteudoParaAssunto, gerarFeedbackDesempenho, gerarReforcoParaQuestao } from "../services/aiService";
import Navbar from "../components/Navbar";

type TipoEstudo = "simples" | "elaborada";

function limparMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

const ToastReforco = ({ visivel, mensagem, onClose }: { visivel: boolean; mensagem: string; onClose: () => void }) => {
  useEffect(() => {
    if (visivel) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }
  }, [visivel, onClose]);

  if (!visivel) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-down pointer-events-none">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
        style={{ background: "rgba(20,18,40,0.97)", border: "1px solid rgba(139,92,246,0.5)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.2)" }}>
        <div className="w-7 h-7 rounded-xl bg-violet-500/20 flex items-center justify-center text-sm animate-brain-pulse">🧠</div>
        <p className="text-sm font-medium text-white">{mensagem}</p>
      </div>
    </div>
  );
};

const ExplicacaoFormatada = ({ texto, tipo }: { texto: string; tipo: TipoEstudo }) => {
  if (!texto) return null;
  const limpo = limparMarkdown(texto);
  const linhas = limpo.split(/\n/).filter((l) => l.trim());

  type TipoLinha = "correta" | "errada" | "conceito" | "dica" | "texto";

  const partes: Array<{ tipo: TipoLinha; conteudo: string }> = linhas.map((l) => {
    const t = l.trim();
    if (t.startsWith("✅")) return { tipo: "correta" as TipoLinha, conteudo: t.replace(/^✅\s*/, "") };
    if (t.startsWith("❌")) return { tipo: "errada" as TipoLinha, conteudo: t.replace(/^❌\s*/, "") };
    if (t.startsWith("📌")) return { tipo: "conceito" as TipoLinha, conteudo: t.replace(/^📌\s*/, "") };
    if (t.startsWith("💡")) return { tipo: "dica" as TipoLinha, conteudo: t.replace(/^💡\s*/, "") };
    return { tipo: "texto" as TipoLinha, conteudo: t };
  });

  if (tipo === "elaborada") {
    return (
      <div className="space-y-2">
        {partes.map((p, i) => {
          if (p.tipo === "correta") return (
            <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <span className="text-success text-sm shrink-0 mt-0.5">✅</span>
              <span className="text-sm leading-relaxed text-success font-medium">{p.conteudo}</span>
            </div>
          );
          if (p.tipo === "errada") return (
            <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-white/35 text-sm shrink-0 mt-0.5">❌</span>
              <span className="text-sm leading-relaxed text-white/50">{p.conteudo}</span>
            </div>
          );
          if (p.tipo === "conceito") return (
            <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <span className="text-violet-400 text-sm shrink-0 mt-0.5">📌</span>
              <span className="text-sm leading-relaxed text-violet-300 font-semibold">{p.conteudo}</span>
            </div>
          );
          if (p.tipo === "dica") return (
            <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <span className="text-yellow-400 text-sm shrink-0 mt-0.5">💡</span>
              <span className="text-sm leading-relaxed text-yellow-300">{p.conteudo}</span>
            </div>
          );
          return <p key={i} className="text-sm leading-relaxed text-white/75 px-1">{p.conteudo}</p>;
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {partes.map((p, i) => {
        if (p.tipo === "correta") return (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
            <span className="text-success text-sm shrink-0">✅</span>
            <span className="text-sm text-success font-medium leading-relaxed">{p.conteudo}</span>
          </div>
        );
        if (p.tipo === "conceito") return (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
            <span className="text-violet-400 text-sm shrink-0">📌</span>
            <span className="text-sm text-violet-300 leading-relaxed">{p.conteudo}</span>
          </div>
        );
        if (p.tipo === "dica") return (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)" }}>
            <span className="text-yellow-400 text-sm shrink-0">💡</span>
            <span className="text-sm text-yellow-300 leading-relaxed">{p.conteudo}</span>
          </div>
        );
        return <p key={i} className="text-sm leading-relaxed text-white/75">{p.conteudo}</p>;
      })}
    </div>
  );
};

const SelecaoTipo = ({ assunto, material, onEscolher, assuntos, assuntoAtual, onTrocarAssunto }: {
  assunto: AssuntoSalvo; material: Material; onEscolher: (tipo: TipoEstudo) => void;
  assuntos: AssuntoSalvo[]; assuntoAtual: string; onTrocarAssunto: (id: string) => void;
}) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <Navbar />
      <main className="relative mx-auto max-w-3xl px-4 pt-24 pb-16">
        <div className="mb-6">
          <button onClick={() => navigate(`/estudos/${material.id}`)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {material.titulo}
          </button>
        </div>
        <div className="mb-8 animate-fade-in-up">
          <span className="text-xs text-violet-400 uppercase tracking-widest font-medium">Assunto</span>
          <h1 className="text-3xl font-bold text-white mt-1" style={{ fontFamily: "Syne, sans-serif" }}>{assunto.titulo}</h1>
          <p className="text-muted-foreground text-sm mt-2">{assunto.descricao}</p>
        </div>
        {assuntos.length > 1 && (
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Outros assuntos</p>
            <div className="flex flex-col gap-2">
              {assuntos.map((a) => (
                <button key={a.id} onClick={() => onTrocarAssunto(a.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border text-left ${a.id === assuntoAtual ? "bg-violet-500/20 border-violet-500/50 text-violet-300" : "border-white/10 text-muted-foreground hover:border-violet-500/30 hover:text-white"}`}>
                  {a.titulo}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Escolha o modo</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => onEscolher("simples")}
              className="group relative overflow-hidden rounded-2xl p-6 text-left border border-white/10 hover:border-blue-500/50 transition-all"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.06))" }} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>⚡</div>
                <h3 className="font-bold text-white text-sm" style={{ fontFamily: "Syne, sans-serif" }}>Flash</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Questões curtas e diretas. Resposta rápida.</p>
              </div>
            </button>
            <button onClick={() => onEscolher("elaborada")}
              className="group relative overflow-hidden rounded-2xl p-6 text-left border border-white/10 hover:border-violet-500/50 transition-all"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.06))" }} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>🎯</div>
                <h3 className="font-bold text-white text-sm" style={{ fontFamily: "Syne, sans-serif" }}>Concurso</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Estilo CESPE/FCC com gabarito comentado detalhado.</p>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

const LoadingQuestoes = ({ mensagem }: { mensagem: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-spin-slow" />
        <div className="absolute inset-0 flex items-center justify-center text-3xl animate-brain-pulse">🧠</div>
      </div>
      <p className="text-white font-semibold" style={{ fontFamily: "Syne, sans-serif" }}>{mensagem}</p>
    </div>
  </div>
);

// ---- Option Button com visual de acerto/erro ----
const OptionButton = ({ alternativa, index, respondida, selecionada, correta, onSelect }: {
  alternativa: string; index: number; respondida: boolean;
  selecionada: string | null; correta: string; onSelect: (alt: string) => void;
}) => {
  const letters = ["A", "B", "C", "D", "E"];
  const letter = letters[index];
  const isSelected = alternativa === selecionada;
  const isCorrect = alternativa === correta;

  let letterBg = "bg-white/10 text-white/60";
  let borderClass = "border-white/10 hover:border-violet-500/40 hover:bg-white/5";
  let rowBg = "";
  let pulse = false;

  if (respondida) {
    if (isCorrect) {
      rowBg = "bg-success/10";
      borderClass = "border-success/50";
      letterBg = "bg-success/25 text-success";
      pulse = true;
    } else if (isSelected) {
      rowBg = "bg-destructive/10";
      borderClass = "border-destructive/40";
      letterBg = "bg-destructive/20 text-destructive";
    } else {
      borderClass = "border-white/5 opacity-40";
    }
  } else if (isSelected) {
    borderClass = "border-violet-500/60 bg-violet-500/10";
    letterBg = "bg-violet-500/30 text-violet-300";
  }

  const textoLimpo = limparMarkdown(alternativa);

  return (
    <button
      onClick={() => !respondida && onSelect(alternativa)}
      disabled={respondida}
      className={`question-option w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left animate-fade-in-up opacity-0 ${rowBg} ${borderClass} ${respondida ? "cursor-default" : ""}`}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
    >
      <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${letterBg} ${pulse ? "animate-pulse" : ""}`}>
        {letter}
      </span>
      <span className="text-sm leading-snug flex-1" style={{
        color: respondida && isCorrect ? "#34d399" : respondida && isSelected && !isCorrect ? "#f87171" : undefined,
      }}>
        {textoLimpo}
      </span>

      {/* Ícone visual de resultado */}
      {respondida && isCorrect && (
        <span className="shrink-0 flex items-center gap-1.5 text-success text-xs font-bold">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/20 border border-success/40">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {isSelected && <span className="hidden sm:inline">Correto!</span>}
        </span>
      )}
      {respondida && isSelected && !isCorrect && (
        <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-destructive/20 border border-destructive/40 text-destructive">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      )}
    </button>
  );
};

// ---- Banner de acerto/erro imediato ----
const ResultBanner = ({ acertou, visivel }: { acertou: boolean; visivel: boolean }) => {
  if (!visivel) return null;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 animate-scale-in ${acertou ? "bg-success/15 border border-success/30" : "bg-destructive/15 border border-destructive/30"}`}>
      <span className="text-xl">{acertou ? "🎉" : "❌"}</span>
      <div>
        <p className={`text-sm font-bold ${acertou ? "text-success" : "text-destructive"}`}>
          {acertou ? "Resposta Correta!" : "Resposta Incorreta"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {acertou ? "Ótimo trabalho! Continue assim." : "Veja o gabarito comentado abaixo."}
        </p>
      </div>
    </div>
  );
};

const ResultScreen = ({ acertos, total, navigate, materialId, assuntoId }: {
  acertos: number; total: number; navigate: (p: string) => void; materialId: string; assuntoId: string;
}) => {
  const taxa = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const [feedback, setFeedback] = useState("Analisando...");
  const size = 160;
  const radius = (size - 12) / 2;
  const circumference = radius * 2 * Math.PI;
  const color = taxa >= 70 ? "#34d399" : taxa >= 40 ? "#fbbf24" : "#f87171";
  const [animR, setAnimR] = useState(0);

  useEffect(() => {
    setTimeout(() => setAnimR(taxa), 400);
    gerarFeedbackDesempenho(taxa, []).then(setFeedback).catch(() => setFeedback("Continue praticando!"));
  }, [taxa]);

  const offset = circumference - (animR / 100) * circumference;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <Navbar />
      <main className="relative mx-auto max-w-2xl px-4 pt-24 pb-16">
        <div className="flex flex-col items-center gap-8">
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="score-ring">
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)", filter: `drop-shadow(0 0 16px ${color})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ color, fontFamily: "Syne, sans-serif" }}>{taxa}%</span>
              <span className="text-xs text-muted-foreground">de acerto</span>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Sessão Concluída!</h1>
            <p className="text-muted-foreground mt-2 text-sm">{taxa >= 70 ? "Excelente! 🎉" : taxa >= 40 ? "Bom progresso! 💪" : "Continue praticando! 🔥"}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full">
            {[
              { label: "Acertos", value: acertos, color: "#34d399", icon: "✅" },
              { label: "Erros", value: total - acertos, color: "#f87171", icon: "❌" },
              { label: "Total", value: total, color: "#a78bfa", icon: "📊" },
            ].map((s, i) => (
              <div key={s.label} className="glass rounded-2xl p-4 text-center animate-fade-in-up opacity-0"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: "forwards", borderColor: `${s.color}20` }}>
                <span className="text-xl">{s.icon}</span>
                <p className="text-2xl font-bold mt-1" style={{ color: s.color, fontFamily: "Syne, sans-serif" }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="w-full glass rounded-2xl p-5 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-xs">🧠</div>
              <span className="text-xs font-semibold text-violet-400">Feedback da IA</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{feedback}</p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={() => navigate(`/estudos/${materialId}`)}
              className="flex-1 glass rounded-2xl py-3 text-sm font-semibold text-white border border-white/10 hover:bg-white/5 transition-all">
              ← Assuntos
            </button>
            <button onClick={() => navigate(`/estudo/${materialId}/${assuntoId}`)}
              className="flex-1 btn-primary rounded-2xl py-3 text-sm font-bold text-white">
              🔄 Tentar Novamente
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const Estudo = () => {
  const { materialId, assuntoId } = useParams<{ materialId: string; assuntoId: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [material, setMaterial] = useState<Material | null>(null);
  const [assuntoAtual, setAssuntoAtual] = useState<AssuntoSalvo | null>(null);
  const [tipoEstudo, setTipoEstudo] = useState<TipoEstudo | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | null>(null);
  const [respondida, setRespondida] = useState(false);
  const [acertouAtual, setAcertouAtual] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerandoPrimeiras, setGerandoPrimeiras] = useState(false);
  const [sessaoFinalizada, setSessaoFinalizada] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [totalRespondidas, setTotalRespondidas] = useState(0);
  const [gerandoReforco, setGerandoReforco] = useState(false);
  const [reforcoGerado, setReforcoGerado] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisivel, setToastVisivel] = useState(false);
  const tempoInicio = useRef<number>(Date.now());

  const mostrarToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisivel(true);
  }, []);

  useEffect(() => {
    if (!materialId) return;
    buscarMaterialPorId(materialId).then((m) => {
      setMaterial(m);
      if (m && assuntoId) {
        const a = m.assuntos?.find((x) => x.id === assuntoId);
        setAssuntoAtual(a || m.assuntos?.[0] || null);
      }
      setCarregando(false);
    });
  }, [materialId, assuntoId]);

  const handleTrocarAssunto = (id: string) => {
    if (!material) return;
    navigate(`/estudo/${materialId}/${id}`, { replace: true });
    const a = material.assuntos?.find((x) => x.id === id);
    setAssuntoAtual(a || null);
    setTipoEstudo(null);
    setQuestoes([]);
    setSessaoFinalizada(false);
    setIndiceAtual(0);
    setReforcoGerado(false);
    setAcertouAtual(null);
  };

  const handleEscolherTipo = async (tipo: TipoEstudo) => {
    if (!usuario || !assuntoAtual || !materialId) return;
    setTipoEstudo(tipo);
    setGerandoPrimeiras(true);

    try {
      const salvas = await buscarQuestoesPorAssunto(usuario.uid, materialId, assuntoAtual.id);
      const doTipo = salvas.filter((q) => q.tipo === tipo);

      if (doTipo.length >= 3) {
        setQuestoes(doTipo.sort(() => Math.random() - 0.5).slice(0, 5));
        setGerandoPrimeiras(false);
        return;
      }

      const respostaRapida = await gerarConteudoParaAssunto(assuntoAtual, tipo, 2);
      const ids = await salvarQuestoes(usuario.uid, materialId, assuntoAtual.id, assuntoAtual.titulo, respostaRapida.questoes);
      const primeirasDuas: Questao[] = respostaRapida.questoes.map((q, i) => ({
        id: ids[i], userId: usuario.uid, materialId: materialId!,
        assuntoId: assuntoAtual.id, assuntoTitulo: assuntoAtual.titulo,
        pergunta: q.pergunta, alternativas: q.alternativas,
        correta: q.correta, explicacao: q.explicacao,
        tipo: q.tipo || tipo, criadoEm: {} as any,
      }));

      setQuestoes(primeirasDuas);
      setGerandoPrimeiras(false);

      setCarregandoMais(true);
      (async () => {
        try {
          const respostaExtra = await gerarConteudoParaAssunto(assuntoAtual, tipo, 3);
          const idsExtra = await salvarQuestoes(usuario.uid, materialId!, assuntoAtual.id, assuntoAtual.titulo, respostaExtra.questoes);
          await salvarFlashcards(usuario.uid, materialId!, assuntoAtual.id, assuntoAtual.titulo,
            [...respostaRapida.flashcards, ...respostaExtra.flashcards], "gerado", material?.titulo);
          const questoesExtra: Questao[] = respostaExtra.questoes.map((q, i) => ({
            id: idsExtra[i], userId: usuario.uid, materialId: materialId!,
            assuntoId: assuntoAtual.id, assuntoTitulo: assuntoAtual.titulo,
            pergunta: q.pergunta, alternativas: q.alternativas,
            correta: q.correta, explicacao: q.explicacao,
            tipo: q.tipo || tipo, criadoEm: {} as any,
          }));
          setQuestoes((prev) => [...prev, ...questoesExtra]);
        } catch { /* silent */ }
        finally { setCarregandoMais(false); }
      })();

    } catch (e) {
      console.error(e);
      setTipoEstudo(null);
      setGerandoPrimeiras(false);
    }
  };

  const handleResponder = async (alternativa: string) => {
    if (respondida || !usuario || !questoes[indiceAtual]) return;
    setRespostaSelecionada(alternativa);
    setRespondida(true);
    const tempoGasto = Math.round((Date.now() - tempoInicio.current) / 1000);
    const questaoAtual = questoes[indiceAtual];
    const acertou = alternativa === questaoAtual.correta;
    setAcertouAtual(acertou);
    if (acertou) setAcertos((p) => p + 1);
    setTotalRespondidas((p) => p + 1);
    setTimeout(() => setShowExplanation(true), 300);

    await registrarResposta(usuario.uid, "questao", questaoAtual.id!, acertou, tempoGasto, {
      assuntoId: questaoAtual.assuntoId,
      assuntoTitulo: questaoAtual.assuntoTitulo,
      pergunta: questaoAtual.pergunta,
    });

    if (!acertou) {
      await salvarFlashcards(usuario.uid, materialId!, questaoAtual.assuntoId, questaoAtual.assuntoTitulo,
        [{ frente: questaoAtual.pergunta, verso: `Correta: ${questaoAtual.correta}\n${questaoAtual.explicacao}` }],
        "erro", material?.titulo);
    }
  };

  const handleGerarReforco = useCallback(async () => {
    if (!usuario || !assuntoAtual || !materialId || !questoes[indiceAtual] || gerandoReforco || reforcoGerado) return;
    setGerandoReforco(true);
    mostrarToast("🧠 Gerando flashcards de reforço...");
    try {
      const q = questoes[indiceAtual];
      const reforco = await gerarReforcoParaQuestao(q.pergunta, q.assuntoTitulo);
      await salvarQuestoes(usuario.uid, materialId!, q.assuntoId, q.assuntoTitulo, reforco.questoes);
      await salvarFlashcards(usuario.uid, materialId!, q.assuntoId, q.assuntoTitulo, reforco.flashcards, "gerado", material?.titulo);
      setReforcoGerado(true);
      mostrarToast("✅ Flashcards de reforço criados!");
    } catch {
      mostrarToast("Erro ao gerar reforço. Tente novamente.");
    } finally { setGerandoReforco(false); }
  }, [usuario, assuntoAtual, materialId, questoes, indiceAtual, gerandoReforco, reforcoGerado, material, mostrarToast]);

  const handleProxima = () => {
    if (indiceAtual < questoes.length - 1) {
      setIndiceAtual((p) => p + 1);
      setRespostaSelecionada(null);
      setRespondida(false);
      setShowExplanation(false);
      setReforcoGerado(false);
      setAcertouAtual(null);
      tempoInicio.current = Date.now();
    } else {
      setSessaoFinalizada(true);
    }
  };

  if (carregando) return <LoadingQuestoes mensagem="Carregando material..." />;
  if (gerandoPrimeiras) return <LoadingQuestoes mensagem="Gerando questões..." />;

  if (!material || !assuntoAtual) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Navbar />
        <p className="text-muted-foreground">Material não encontrado.</p>
        <button onClick={() => navigate("/estudos")} className="text-violet-400 hover:underline text-sm">← Voltar</button>
      </div>
    );
  }

  if (!tipoEstudo) {
    return (
      <SelecaoTipo assunto={assuntoAtual} material={material} onEscolher={handleEscolherTipo}
        assuntos={material.assuntos || []} assuntoAtual={assuntoAtual.id}
        onTrocarAssunto={handleTrocarAssunto} />
    );
  }

  if (sessaoFinalizada) {
    return <ResultScreen acertos={acertos} total={totalRespondidas}
      navigate={navigate} materialId={materialId!} assuntoId={assuntoAtual.id} />;
  }

  const questaoAtual = questoes[indiceAtual];
  const progPercent = questoes.length > 0 ? ((indiceAtual + (respondida ? 1 : 0)) / Math.max(questoes.length, 5)) * 100 : 0;
  const totalQuestoes = carregandoMais ? `${questoes.length}+` : `${questoes.length}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-15 pointer-events-none" />
      <Navbar />

      <ToastReforco visivel={toastVisivel} mensagem={toastMsg} onClose={() => setToastVisivel(false)} />

      <main className="relative mx-auto max-w-2xl px-4 pt-20 pb-16">
        {/* Top bar */}
        <div className="mb-4 animate-fade-in-down">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navigate(`/estudos/${materialId}`)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {material.titulo}
            </button>
            <div className="flex items-center gap-2">
              {carregandoMais && (
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-2 h-2 rounded-full border border-violet-400/40 border-t-violet-400 animate-spin" />
                  Carregando mais...
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-md text-[10px] border ${tipoEstudo === "simples" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-violet-500/10 border-violet-500/20 text-violet-400"}`}>
                {tipoEstudo === "simples" ? "⚡ Flash" : "🎯 Concurso"}
              </span>
            </div>
          </div>

          {/* Switcher de assuntos */}
          {(material.assuntos?.length || 0) > 1 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {material.assuntos?.map((a) => (
                <button key={a.id} onClick={() => handleTrocarAssunto(a.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${a.id === assuntoAtual.id ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "border-white/10 text-muted-foreground hover:border-violet-500/30 hover:text-white"}`}>
                  {a.titulo}
                </button>
              ))}
            </div>
          )}

          {/* Progresso */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <div className="flex items-center gap-2">
              <span className="glass rounded-lg px-2.5 py-1 text-violet-400 font-mono font-bold text-[11px]">
                {indiceAtual + 1}/{totalQuestoes}
              </span>
              <span className="text-xs text-muted-foreground">{assuntoAtual.titulo}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="text-success">✓</span><span className="text-success font-semibold">{acertos}</span></span>
              <span className="flex items-center gap-1"><span className="text-destructive">✗</span><span className="text-destructive font-semibold">{totalRespondidas - acertos}</span></span>
            </div>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progPercent}%`, background: "linear-gradient(90deg, #7c3aed, #6366f1, #60a5fa)", boxShadow: "0 0 8px rgba(139,92,246,0.5)" }} />
          </div>
        </div>

        {/* Card da questão */}
        <div key={`${assuntoAtual.id}-${indiceAtual}`} className="glass-strong rounded-3xl p-6 mb-5 animate-scale-in" style={{ border: "1px solid rgba(139,92,246,0.15)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              {assuntoAtual.titulo} · Q{indiceAtual + 1}
            </span>
            <button onClick={handleGerarReforco} disabled={gerandoReforco || reforcoGerado}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                reforcoGerado ? "border-success/30 bg-success/10 text-success cursor-default"
                : gerandoReforco ? "border-violet-500/20 bg-violet-500/8 text-violet-400/60 cursor-wait"
                : "border-yellow-500/25 bg-yellow-500/8 text-yellow-400 hover:bg-yellow-500/15 hover:border-yellow-500/50"
              }`}>
              {gerandoReforco ? (
                <><div className="w-3 h-3 rounded-full border border-violet-400/40 border-t-violet-400 animate-spin" /><span>Gerando...</span></>
              ) : reforcoGerado ? (
                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span>Salvo!</span></>
              ) : (
                <><span>📌</span><span>Revisar</span></>
              )}
            </button>
          </div>

          <h2 className="text-base leading-relaxed text-white/95 font-medium mb-6" style={{ lineHeight: "1.7" }}>
            {limparMarkdown(questaoAtual?.pergunta || "")}
          </h2>

          <div className="space-y-2.5">
            {questaoAtual?.alternativas.map((alt, i) => (
              <OptionButton key={i} alternativa={alt} index={i}
                respondida={respondida} selecionada={respostaSelecionada}
                correta={questaoAtual.correta} onSelect={handleResponder} />
            ))}
          </div>
        </div>

        {/* Banner de resultado + Gabarito comentado ABAIXO do card */}
        {respondida && (
          <div className="animate-fade-in-up space-y-4">
            {/* Banner visual de acerto/erro */}
            <ResultBanner acertou={acertouAtual!} visivel={true} />

            {/* Gabarito comentado */}
            {showExplanation && (
              <div className="glass rounded-2xl p-5 border border-violet-500/15">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-xs">💡</div>
                  <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                    {tipoEstudo === "elaborada" ? "Gabarito Comentado" : "Explicação"}
                  </span>
                </div>
                <ExplicacaoFormatada texto={questaoAtual?.explicacao || ""} tipo={tipoEstudo} />
              </div>
            )}

            {/* Botão próxima */}
            <button onClick={handleProxima}
              className="btn-primary w-full rounded-2xl py-3.5 text-sm font-bold text-white"
              style={{ fontFamily: "Syne, sans-serif" }}>
              {indiceAtual < questoes.length - 1 ? (
                <span className="flex items-center justify-center gap-2">
                  Próxima questão
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              ) : (
                <span>🏁 Ver Resultado</span>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Estudo;