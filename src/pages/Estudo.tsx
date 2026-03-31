// src/pages/Estudo.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  buscarMaterialPorId,
  buscarQuestoesPorAssunto,
  salvarQuestoes,
  salvarFlashcards,
  registrarResposta,
  Material,
  Questao,
  AssuntoSalvo,
} from "../services/firebaseService";
import {
  gerarConteudoParaAssunto,
  gerarFeedbackDesempenho,
  gerarReforcoParaQuestao,
} from "../services/aiService";
import Navbar from "../components/Navbar";
import QuestaoCard from "../components/QuestaoCard";

type TipoEstudo = "simples" | "elaborada";

// ─── Toast ────────────────────────────────────────────────────────────────────

const ToastReforco = ({
  visivel,
  mensagem,
  onClose,
}: {
  visivel: boolean;
  mensagem: string;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (visivel) {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [visivel, onClose]);

  if (!visivel) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-down pointer-events-none">
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
        style={{
          background: "rgba(20,18,40,0.97)",
          border: "1px solid rgba(139,92,246,0.5)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.2)",
        }}
      >
        <div className="w-7 h-7 rounded-xl bg-violet-500/20 flex items-center justify-center text-sm animate-brain-pulse">
          🧠
        </div>
        <p className="text-sm font-medium text-white">{mensagem}</p>
      </div>
    </div>
  );
};

// ─── Loading aguardando IA gerar mais questões ────────────────────────────────

const AguardandoIA = ({ tipoEstudo }: { tipoEstudo: TipoEstudo }) => {
  const [dots, setDots] = useState(0);
  const [dica, setDica] = useState(0);

  const dicas = [
    "A IA está criando questões personalizadas para você",
    "Gerando perguntas de associação, certo/errado e múltipla escolha",
    "Adaptando o conteúdo ao seu nível de desempenho",
    "Preparando gabaritos comentados detalhados",
    "Quase pronto! Mais alguns segundos...",
  ];

  useEffect(() => {
    const d = setInterval(() => setDots((p) => (p + 1) % 4), 400);
    const dk = setInterval(() => setDica((p) => (p + 1) % dicas.length), 2500);
    return () => { clearInterval(d); clearInterval(dk); };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-[120px]" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/8 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center max-w-md">
        {/* Orb animado */}
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border-2 border-indigo-500/15 animate-spin-slow" style={{ animationDirection: "reverse", animationDuration: "6s" }} />

          {/* Orbiting dots */}
          <div className="absolute inset-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full top-1/2 left-1/2 -mt-1.5 -ml-1.5"
                style={{
                  background: ["#a78bfa", "#60a5fa", "#34d399"][i],
                  boxShadow: `0 0 8px ${["#a78bfa", "#60a5fa", "#34d399"][i]}`,
                  animation: `orbit 2s linear infinite`,
                  animationDelay: `${i * 0.66}s`,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center animate-brain-pulse"
              style={{ boxShadow: "0 0 30px rgba(139,92,246,0.5)" }}
            >
              <span className="text-2xl">🧠</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
            <span className="text-gradient">IA gerando questões</span>
            <span className="text-violet-400">{".".repeat(dots + 1)}</span>
          </h2>
          <p
            key={dica}
            className="text-sm text-muted-foreground animate-fade-in"
          >
            {dicas[dica]}
          </p>
        </div>

        {/* Barra de progresso indeterminada */}
        <div className="w-full max-w-xs">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: "40%",
                background: "linear-gradient(90deg, #7c3aed, #6366f1, #60a5fa)",
                animation: "shimmer 1.5s infinite",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Modo: {tipoEstudo === "simples" ? "⚡ Flash" : "🎯 Concurso"}
          </p>
        </div>

        {/* Tipos sendo gerados */}
        <div className="flex gap-2 flex-wrap justify-center">
          {[
            { icon: "🎯", label: "Múltipla escolha" },
            { icon: "✓✗", label: "Certo/Errado" },
            { icon: "🔗", label: "Associação I-IV" },
          ].map((t, i) => (
            <div
              key={t.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground border border-white/8"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Seleção de tipo ──────────────────────────────────────────────────────────

const SelecaoTipo = ({
  assunto,
  material,
  onEscolher,
  assuntos,
  assuntoAtual,
  onTrocarAssunto,
}: {
  assunto: AssuntoSalvo;
  material: Material;
  onEscolher: (tipo: TipoEstudo) => void;
  assuntos: AssuntoSalvo[];
  assuntoAtual: string;
  onTrocarAssunto: (id: string) => void;
}) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <Navbar />
      <main className="relative mx-auto max-w-3xl px-4 pt-24 pb-16">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/estudos/${material.id}`)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {material.titulo}
          </button>
        </div>

        <div className="mb-8 animate-fade-in-up">
          <span className="text-xs text-violet-400 uppercase tracking-widest font-medium">Assunto</span>
          <h1 className="text-3xl font-bold text-white mt-1" style={{ fontFamily: "Syne, sans-serif" }}>
            {assunto.titulo}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">{assunto.descricao}</p>
        </div>

        {assuntos.length > 1 && (
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Outros assuntos
            </p>
            <div className="flex flex-col gap-2">
              {assuntos.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onTrocarAssunto(a.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border text-left ${
                    a.id === assuntoAtual
                      ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                      : "border-white/10 text-muted-foreground hover:border-violet-500/30 hover:text-white"
                  }`}
                >
                  {a.titulo}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            Escolha o modo
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* Flash */}
            <button
              onClick={() => onEscolher("simples")}
              className="group relative overflow-hidden rounded-2xl p-6 text-left border border-white/10 hover:border-blue-500/50 transition-all"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.06))" }} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
                  style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
                  ⚡
                </div>
                <h3 className="font-bold text-white text-sm" style={{ fontFamily: "Syne, sans-serif" }}>Flash</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Questões curtas e diretas. Resposta rápida.
                </p>
              </div>
            </button>

            {/* Concurso */}
            <button
              onClick={() => onEscolher("elaborada")}
              className="group relative overflow-hidden rounded-2xl p-6 text-left border border-white/10 hover:border-violet-500/50 transition-all"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.06))" }} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
                  style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
                  🎯
                </div>
                <h3 className="font-bold text-white text-sm" style={{ fontFamily: "Syne, sans-serif" }}>Concurso</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Estilo CESPE/FCC com gabarito comentado. Inclui I, II, III, IV.
                </p>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

// ─── Loading inicial ──────────────────────────────────────────────────────────

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

// ─── Tela de resultado ────────────────────────────────────────────────────────

const ResultScreen = ({
  acertos,
  total,
  puladas,
  navigate,
  materialId,
  assuntoId,
  onContinuar,
}: {
  acertos: number;
  total: number;
  puladas: number;
  navigate: (p: string) => void;
  materialId: string;
  assuntoId: string;
  onContinuar: () => void;
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
          {/* Anel de pontuação */}
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="score-ring">
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
              <div
                key={s.label}
                className="glass rounded-2xl p-4 text-center animate-fade-in-up opacity-0"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "forwards", borderColor: `${s.color}20` }}
              >
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

          {/* Ações */}
          <div className="flex gap-3 w-full">
            <button
              onClick={() => navigate(`/estudos/${materialId}`)}
              className="flex-1 glass rounded-2xl py-3 text-sm font-semibold text-white border border-white/10 hover:bg-white/5 transition-all"
            >
              ← Assuntos
            </button>
            <button
              onClick={onContinuar}
              className="flex-1 btn-primary rounded-2xl py-3 text-sm font-bold text-white flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              <span>Continuar Estudando</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const QUESTOES_LOTE = 5; // questões por lote de geração
const QUESTOES_META = 10; // meta inicial antes do primeiro "ver resultado"
const THRESHOLD_ADAPTATIVO = Math.floor(QUESTOES_META / 2); // na metade, gera próximo lote

const Estudo = () => {
  const { materialId, assuntoId } = useParams<{ materialId: string; assuntoId: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [material, setMaterial] = useState<Material | null>(null);
  const [assuntoAtual, setAssuntoAtual] = useState<AssuntoSalvo | null>(null);
  const [tipoEstudo, setTipoEstudo] = useState<TipoEstudo | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [aguardandoIA, setAguardandoIA] = useState(false); // loading quando usuário chega no fim antes da IA terminar
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [respondida, setRespondida] = useState(false);
  const [acertouAtual, setAcertouAtual] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerandoPrimeiras, setGerandoPrimeiras] = useState(false);
  const [sessaoFinalizada, setSessaoFinalizada] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [totalRespondidas, setTotalRespondidas] = useState(0);
  const [totalPuladas, setTotalPuladas] = useState(0);
  const [gerandoReforco, setGerandoReforco] = useState(false);
  const [reforcoGerado, setReforcoGerado] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisivel, setToastVisivel] = useState(false);

  // questões puladas
  const [puladas, setPuladas] = useState<number[]>([]);
  const [modoRevisaoPuladas, setModoRevisaoPuladas] = useState(false);
  const [revisandoPuladaIdx, setRevisandoPuladaIdx] = useState(0);

  // questão revelada
  const [questaoRevelada, setQuestaoRevelada] = useState(false);

  // controle de geração adaptativa
  const gerandoMaisRef = useRef(false); // evita dupla geração
  const errosRef = useRef<string[]>([]); // perguntas erradas para adaptativo
  const questoesRef = useRef<Questao[]>([]); // ref síncrona para questoes

  const tempoInicio = useRef<number>(Date.now());

  // Mantém ref sincronizada
  useEffect(() => {
    questoesRef.current = questoes;
  }, [questoes]);

  const mostrarToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisivel(true);
  }, []);

  // ── Carrega material ──────────────────────────────────────────────────────

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

  // ── Troca de assunto ──────────────────────────────────────────────────────

  const handleTrocarAssunto = (id: string) => {
    if (!material) return;
    navigate(`/estudo/${materialId}/${id}`, { replace: true });
    const a = material.assuntos?.find((x) => x.id === id);
    setAssuntoAtual(a || null);
    resetSessao();
    setTipoEstudo(null);
    setQuestoes([]);
    questoesRef.current = [];
    errosRef.current = [];
  };

  const resetSessao = () => {
    setIndiceAtual(0);
    setRespondida(false);
    setAcertouAtual(null);
    setQuestaoRevelada(false);
    setAcertos(0);
    setTotalRespondidas(0);
    setTotalPuladas(0);
    setPuladas([]);
    setModoRevisaoPuladas(false);
    setRevisandoPuladaIdx(0);
    setSessaoFinalizada(false);
    setReforcoGerado(false);
    setAguardandoIA(false);
    gerandoMaisRef.current = false;
    errosRef.current = [];
    tempoInicio.current = Date.now();
  };

  // ── Geração de mais questões (adaptativa) ─────────────────────────────────

  const gerarMaisQuestoes = useCallback(async (
    assunto: AssuntoSalvo,
    tipo: TipoEstudo,
    matId: string,
    matTitulo?: string
  ) => {
    if (gerandoMaisRef.current) return;
    gerandoMaisRef.current = true;
    setCarregandoMais(true);

    try {
      const erros = errosRef.current.slice(0, 3);
      const resposta = await gerarConteudoParaAssunto(assunto, tipo, QUESTOES_LOTE, erros.length > 0 ? erros : undefined);

      if (resposta.questoes.length === 0) return;

      const ids = await salvarQuestoes(
        usuario!.uid, matId, assunto.id, assunto.titulo,
        resposta.questoes
      );

      await salvarFlashcards(
        usuario!.uid, matId, assunto.id, assunto.titulo,
        resposta.flashcards, "gerado", matTitulo
      );

      const novasQuestoes: Questao[] = resposta.questoes.map((q, i) => ({
        id: ids[i],
        userId: usuario!.uid,
        materialId: matId,
        assuntoId: assunto.id,
        assuntoTitulo: assunto.titulo,
        pergunta: q.pergunta,
        alternativas: q.alternativas,
        correta: q.correta,
        explicacao: q.explicacao,
        tipo: q.tipo || tipo,
        criadoEm: {} as any,
      }));

      setQuestoes((prev) => {
        const novaLista = [...prev, ...novasQuestoes];
        questoesRef.current = novaLista;
        return novaLista;
      });

      // Se estava aguardando a IA, desbloqueia
      setAguardandoIA(false);
    } catch (e) {
      console.error("Erro ao gerar mais questões:", e);
      setAguardandoIA(false);
    } finally {
      setCarregandoMais(false);
      gerandoMaisRef.current = false;
    }
  }, [usuario]);

  // ── Escolhe tipo e gera questões iniciais ─────────────────────────────────

  const handleEscolherTipo = async (tipo: TipoEstudo) => {
    if (!usuario || !assuntoAtual || !materialId) return;
    setTipoEstudo(tipo);
    setGerandoPrimeiras(true);
    resetSessao();

    try {
      const salvas = await buscarQuestoesPorAssunto(usuario.uid, materialId, assuntoAtual.id);
      const doTipo = salvas.filter((q) => q.tipo === tipo);

      if (doTipo.length >= QUESTOES_LOTE) {
        const lista = doTipo.sort(() => Math.random() - 0.5).slice(0, QUESTOES_META);
        setQuestoes(lista);
        questoesRef.current = lista;
        setGerandoPrimeiras(false);
        return;
      }

      // Gera primeiro lote
      const respostaPrimeira = await gerarConteudoParaAssunto(assuntoAtual, tipo, QUESTOES_LOTE);
      const ids = await salvarQuestoes(
        usuario.uid, materialId, assuntoAtual.id, assuntoAtual.titulo,
        respostaPrimeira.questoes
      );

      const primeiroLote: Questao[] = respostaPrimeira.questoes.map((q, i) => ({
        id: ids[i],
        userId: usuario.uid,
        materialId: materialId!,
        assuntoId: assuntoAtual.id,
        assuntoTitulo: assuntoAtual.titulo,
        pergunta: q.pergunta,
        alternativas: q.alternativas,
        correta: q.correta,
        explicacao: q.explicacao,
        tipo: q.tipo || tipo,
        criadoEm: {} as any,
      }));

      setQuestoes(primeiroLote);
      questoesRef.current = primeiroLote;
      setGerandoPrimeiras(false);

      // Gera segundo lote em background imediatamente
      gerarMaisQuestoes(assuntoAtual, tipo, materialId!, material?.titulo);

      // Salva flashcards do primeiro lote
      await salvarFlashcards(
        usuario.uid, materialId!, assuntoAtual.id, assuntoAtual.titulo,
        respostaPrimeira.flashcards, "gerado", material?.titulo
      );
    } catch (e) {
      console.error(e);
      setTipoEstudo(null);
      setGerandoPrimeiras(false);
    }
  };

  // ── Helpers de navegação ──────────────────────────────────────────────────

  const questaoCorrente = (): Questao | null => {
    if (modoRevisaoPuladas) {
      const idx = puladas[revisandoPuladaIdx];
      return questoes[idx] ?? null;
    }
    return questoes[indiceAtual] ?? null;
  };

  const proximaQuestao = () => {
    setRespondida(false);
    setAcertouAtual(null);
    setQuestaoRevelada(false);
    setReforcoGerado(false);
    tempoInicio.current = Date.now();

    if (modoRevisaoPuladas) {
      if (revisandoPuladaIdx < puladas.length - 1) {
        setRevisandoPuladaIdx((p) => p + 1);
      } else {
        setSessaoFinalizada(true);
      }
      return;
    }

    const proximoIndice = indiceAtual + 1;

    // Verifica se há próxima questão disponível
    if (proximoIndice < questoesRef.current.length) {
      setIndiceAtual(proximoIndice);

      // Gatilho adaptativo: na metade das questões, gera mais
      if (
        proximoIndice === THRESHOLD_ADAPTATIVO &&
        !gerandoMaisRef.current &&
        tipoEstudo &&
        assuntoAtual &&
        materialId
      ) {
        gerarMaisQuestoes(assuntoAtual, tipoEstudo, materialId!, material?.titulo);
      }
    } else {
      // Não há próxima questão disponível
      if (gerandoMaisRef.current || carregandoMais) {
        // IA ainda está gerando — mostra loading
        setAguardandoIA(true);
        // Fica verificando até ter questão disponível
        const check = setInterval(() => {
          if (questoesRef.current.length > proximoIndice) {
            clearInterval(check);
            setAguardandoIA(false);
            setIndiceAtual(proximoIndice);
          }
        }, 500);
      } else if (puladas.length > 0) {
        setModoRevisaoPuladas(true);
        setRevisandoPuladaIdx(0);
      } else {
        setSessaoFinalizada(true);
      }
    }
  };

  // ── Continuar estudando (após resultado) ─────────────────────────────────

  const handleContinuar = () => {
    if (!tipoEstudo || !assuntoAtual || !materialId) return;

    // Reseta contadores mas mantém as questões existentes (adicionando mais)
    setIndiceAtual(0);
    setRespondida(false);
    setAcertouAtual(null);
    setQuestaoRevelada(false);
    setAcertos(0);
    setTotalRespondidas(0);
    setTotalPuladas(0);
    setPuladas([]);
    setModoRevisaoPuladas(false);
    setRevisandoPuladaIdx(0);
    setSessaoFinalizada(false);
    setReforcoGerado(false);
    setAguardandoIA(false);
    errosRef.current = [];
    tempoInicio.current = Date.now();

    // Gera novo lote de questões
    gerandoMaisRef.current = false;
    setQuestoes([]);
    questoesRef.current = [];

    // Inicia nova geração
    setGerandoPrimeiras(true);
    (async () => {
      try {
        const resposta = await gerarConteudoParaAssunto(assuntoAtual, tipoEstudo, QUESTOES_LOTE);
        const ids = await salvarQuestoes(
          usuario!.uid, materialId!, assuntoAtual.id, assuntoAtual.titulo,
          resposta.questoes
        );
        const novas: Questao[] = resposta.questoes.map((q, i) => ({
          id: ids[i],
          userId: usuario!.uid,
          materialId: materialId!,
          assuntoId: assuntoAtual.id,
          assuntoTitulo: assuntoAtual.titulo,
          pergunta: q.pergunta,
          alternativas: q.alternativas,
          correta: q.correta,
          explicacao: q.explicacao,
          tipo: q.tipo || tipoEstudo,
          criadoEm: {} as any,
        }));
        setQuestoes(novas);
        questoesRef.current = novas;
        setGerandoPrimeiras(false);
        // Gera mais em background
        gerarMaisQuestoes(assuntoAtual, tipoEstudo, materialId!, material?.titulo);
      } catch {
        setGerandoPrimeiras(false);
      }
    })();
  };

  // ── Pular questão ─────────────────────────────────────────────────────────

  const handlePular = () => {
    if (respondida || questaoRevelada || modoRevisaoPuladas) return;

    setPuladas((prev) => {
      if (!prev.includes(indiceAtual)) return [...prev, indiceAtual];
      return prev;
    });
    setTotalPuladas((p) => p + 1);

    setRespondida(false);
    setAcertouAtual(null);
    setQuestaoRevelada(false);
    setReforcoGerado(false);
    tempoInicio.current = Date.now();

    const proximoIndice = indiceAtual + 1;

    if (proximoIndice < questoesRef.current.length) {
      setIndiceAtual(proximoIndice);

      if (
        proximoIndice === THRESHOLD_ADAPTATIVO &&
        !gerandoMaisRef.current &&
        tipoEstudo &&
        assuntoAtual &&
        materialId
      ) {
        gerarMaisQuestoes(assuntoAtual, tipoEstudo, materialId!, material?.titulo);
      }
    } else {
      if (gerandoMaisRef.current || carregandoMais) {
        setAguardandoIA(true);
        const check = setInterval(() => {
          if (questoesRef.current.length > proximoIndice) {
            clearInterval(check);
            setAguardandoIA(false);
            setIndiceAtual(proximoIndice);
          }
        }, 500);
      } else if (puladas.length > 0) {
        setModoRevisaoPuladas(true);
        setRevisandoPuladaIdx(0);
      } else {
        setSessaoFinalizada(true);
      }
    }
  };

  // ── Mostrar resposta ──────────────────────────────────────────────────────

  const handleMostrarResposta = () => {
    setQuestaoRevelada(true);
  };

  // ── Responder ─────────────────────────────────────────────────────────────

  const handleResponder = async (alternativa: string) => {
    const q = questaoCorrente();
    if (respondida || questaoRevelada || !usuario || !q) return;

    setRespondida(true);
    const tempoGasto = Math.round((Date.now() - tempoInicio.current) / 1000);
    const acertou = alternativa === q.correta;
    setAcertouAtual(acertou);
    if (acertou) setAcertos((p) => p + 1);
    setTotalRespondidas((p) => p + 1);

    // Registra erro para geração adaptativa
    if (!acertou) {
      errosRef.current = [...errosRef.current, q.pergunta].slice(-5);
    }

    await registrarResposta(usuario.uid, "questao", q.id!, acertou, tempoGasto, {
      assuntoId: q.assuntoId,
      assuntoTitulo: q.assuntoTitulo,
      pergunta: q.pergunta,
    });

    if (!acertou) {
      await salvarFlashcards(
        usuario.uid, materialId!, q.assuntoId, q.assuntoTitulo,
        [{ frente: q.pergunta, verso: `Correta: ${q.correta}\n${q.explicacao}` }],
        "erro", material?.titulo
      );
    }
  };

  // ── Gerar reforço ─────────────────────────────────────────────────────────

  const handleGerarReforco = useCallback(async () => {
    const q = questaoCorrente();
    if (!usuario || !assuntoAtual || !materialId || !q || gerandoReforco || reforcoGerado) return;
    setGerandoReforco(true);
    mostrarToast("🧠 Gerando flashcards de reforço...");
    try {
      const reforco = await gerarReforcoParaQuestao(q.pergunta, q.assuntoTitulo);
      await salvarQuestoes(usuario.uid, materialId!, q.assuntoId, q.assuntoTitulo, reforco.questoes);
      await salvarFlashcards(
        usuario.uid, materialId!, q.assuntoId, q.assuntoTitulo,
        reforco.flashcards, "gerado", material?.titulo
      );
      setReforcoGerado(true);
      mostrarToast("✅ Flashcards de reforço criados!");
    } catch {
      mostrarToast("Erro ao gerar reforço. Tente novamente.");
    } finally {
      setGerandoReforco(false);
    }
  }, [usuario, assuntoAtual, materialId, gerandoReforco, reforcoGerado, material, mostrarToast, questoes, indiceAtual, modoRevisaoPuladas, revisandoPuladaIdx, puladas]);

  // ─────────────────────────────────────────────────────────────────────────

  if (carregando) return <LoadingQuestoes mensagem="Carregando material..." />;
  if (gerandoPrimeiras) return <LoadingQuestoes mensagem="Gerando questões com IA..." />;

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
      <SelecaoTipo
        assunto={assuntoAtual} material={material} onEscolher={handleEscolherTipo}
        assuntos={material.assuntos || []} assuntoAtual={assuntoAtual.id}
        onTrocarAssunto={handleTrocarAssunto}
      />
    );
  }

  // Aguardando a IA gerar mais questões
  if (aguardandoIA) {
    return <AguardandoIA tipoEstudo={tipoEstudo} />;
  }

  if (sessaoFinalizada) {
    return (
      <ResultScreen
        acertos={acertos} total={totalRespondidas} puladas={totalPuladas}
        navigate={navigate} materialId={materialId!} assuntoId={assuntoAtual.id}
        onContinuar={handleContinuar}
      />
    );
  }

  const questaoAtual = questaoCorrente();
  if (!questaoAtual) return <LoadingQuestoes mensagem="Carregando questão..." />;

  // Progresso
  const totalQuestoes = carregandoMais ? `${questoes.length}+` : `${questoes.length}`;
  const indiceExibido = modoRevisaoPuladas ? revisandoPuladaIdx + 1 : indiceAtual + 1;
  const totalExibido = modoRevisaoPuladas ? `${puladas.length} (revisão)` : totalQuestoes;
  const progPercent = questoes.length > 0
    ? ((indiceAtual + (respondida ? 1 : 0)) / Math.max(questoes.length, QUESTOES_META)) * 100
    : 0;

  // Pode pular? Apenas no fluxo normal, e se houver mais questões à frente ou IA gerando
  const podePular =
    !modoRevisaoPuladas &&
    !respondida &&
    !questaoRevelada &&
    (indiceAtual < questoes.length - 1 || carregandoMais);

  // temProxima: true se há questão após esta ou se IA ainda está gerando mais
  const temProxima = modoRevisaoPuladas
    ? revisandoPuladaIdx < puladas.length - 1
    : indiceAtual < questoes.length - 1 || carregandoMais || puladas.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-15 pointer-events-none" />
      <Navbar />

      <ToastReforco
        visivel={toastVisivel}
        mensagem={toastMsg}
        onClose={() => setToastVisivel(false)}
      />

      <main className="relative mx-auto max-w-2xl px-4 pt-20 pb-16">
        {/* ── Top bar ── */}
        <div className="mb-4 animate-fade-in-down">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate(`/estudos/${materialId}`)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {material.titulo}
            </button>

            <div className="flex items-center gap-2">
              {carregandoMais && (
                <span className="flex items-center gap-1.5 text-[10px] text-violet-400">
                  <div className="w-2 h-2 rounded-full border border-violet-400/40 border-t-violet-400 animate-spin" />
                  IA gerando mais...
                </span>
              )}

              {modoRevisaoPuladas && (
                <span
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                  style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}
                >
                  ⏭️ Revisando puladas
                </span>
              )}

              <span
                className={`px-2 py-0.5 rounded-md text-[10px] border ${
                  tipoEstudo === "simples"
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-violet-500/10 border-violet-500/20 text-violet-400"
                }`}
              >
                {tipoEstudo === "simples" ? "⚡ Flash" : "🎯 Concurso"}
              </span>
            </div>
          </div>

          {/* Switcher de assuntos */}
          {(material.assuntos?.length || 0) > 1 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {material.assuntos?.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleTrocarAssunto(a.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                    a.id === assuntoAtual.id
                      ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                      : "border-white/10 text-muted-foreground hover:border-violet-500/30 hover:text-white"
                  }`}
                >
                  {a.titulo}
                </button>
              ))}
            </div>
          )}

          {/* Barra de progresso */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <div className="flex items-center gap-2">
              <span className="glass rounded-lg px-2.5 py-1 text-violet-400 font-mono font-bold text-[11px]">
                {indiceExibido}/{totalExibido}
              </span>
              <span className="text-xs text-muted-foreground">{assuntoAtual.titulo}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="text-success">✓</span>
                <span className="text-success font-semibold">{acertos}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-destructive">✗</span>
                <span className="text-destructive font-semibold">{totalRespondidas - acertos}</span>
              </span>
              {totalPuladas > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-yellow-400">⏭</span>
                  <span className="text-yellow-400 font-semibold">{totalPuladas}</span>
                </span>
              )}
            </div>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progPercent}%`,
                background: "linear-gradient(90deg, #7c3aed, #6366f1, #60a5fa)",
                boxShadow: "0 0 8px rgba(139,92,246,0.5)",
              }}
            />
          </div>
        </div>

        {/* ── Questão ── */}
        <QuestaoCard
          key={`${assuntoAtual.id}-${indiceAtual}-${modoRevisaoPuladas ? `p${revisandoPuladaIdx}` : ""}`}
          pergunta={questaoAtual.pergunta}
          alternativas={questaoAtual.alternativas}
          correta={questaoAtual.correta}
          explicacao={questaoAtual.explicacao}
          tipo={tipoEstudo}
          assuntoTitulo={assuntoAtual.titulo}
          indice={indiceExibido}
          totalQuestoes={totalExibido}
          onResponder={handleResponder}
          onProxima={proximaQuestao}
          onPular={handlePular}
          onMostrarResposta={handleMostrarResposta}
          onGerarReforco={handleGerarReforco}
          respondida={respondida}
          acertouAtual={acertouAtual}
          gerandoReforco={gerandoReforco}
          reforcoGerado={reforcoGerado}
          podePular={podePular}
          temProxima={temProxima}
          carregandoMais={carregandoMais}
        />
      </main>
    </div>
  );
};

export default Estudo;