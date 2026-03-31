// src/components/QuestaoCard.tsx
import { useState, useEffect } from "react";

// ─── helpers ────────────────────────────────────────────────────────────────

export function limparMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

function stripLetraAlternativa(texto: string): string {
  return limparMarkdown(texto).replace(/^[A-E]\)\s*/i, "").trim();
}

export type TipoQuestao = "multipla" | "certo_errado" | "associacao";

export function detectarTipoQuestao(alternativas: string[], pergunta?: string): TipoQuestao {
  if (!alternativas || alternativas.length === 0) return "multipla";

  const textos = alternativas.map((a) => limparMarkdown(a).replace(/^[A-E]\)\s*/i, "").trim().toLowerCase());

  if (
    alternativas.length === 2 &&
    textos.some((t) => t.includes("certo") || t.includes("verdadeiro")) &&
    textos.some((t) => t.includes("errado") || t.includes("falso"))
  ) return "certo_errado";

  if (pergunta) {
    const perguntaLower = pergunta.toLowerCase();
    const temItensRomanos = /\b(i{1,3}|iv|v{1,3}|vi{1,3}|ix|x)\s*[\.\-\)]/i.test(pergunta);
    const temJulgamento = /julgue|analise os itens|marque a (opção|alternativa)|assinale a (opção|alternativa) (que|correta)/i.test(perguntaLower);
    if (temItensRomanos || (temJulgamento && alternativas.some((a) => /I{1,3}|IV|V/i.test(a)))) return "associacao";
    const temNumeracao = /^\s*\d+[\.\)]\s/m.test(pergunta);
    if (temNumeracao && alternativas.some((a) => /apenas|somente|todos|nenhum/i.test(a))) return "associacao";
  }

  const temAssociacao = alternativas.some((a) => {
    const limpo = limparMarkdown(a).replace(/^[A-E]\)\s*/i, "").trim();
    return (
      /^(apenas|somente)\s+(i{1,3}|iv|v|vi{1,3})\b/i.test(limpo) ||
      /\b(i{1,3}|iv|v{1,3}|vi{1,3})\s*(,|e)\s*(i{1,3}|iv|v{1,3}|vi{1,3})\b/i.test(limpo) ||
      /^todos\s+(est|são|estão)/i.test(limpo) ||
      /^nenhum/i.test(limpo)
    );
  });
  if (temAssociacao) return "associacao";

  const temItens = alternativas.some((a) =>
    /^[IVX]+[\.\)]\s/.test(limparMarkdown(a).trim()) ||
    /^\d+[\.\)]\s/.test(limparMarkdown(a).trim())
  );
  if (temItens) return "associacao";

  return "multipla";
}

// ─── Formatar enunciado com itens I, II, III, IV ────────────────────────────

function PerguntaFormatada({ texto }: { texto: string }) {
  const limpo = limparMarkdown(texto);
  if (!limpo.includes("\n")) return <>{limpo}</>;

  const linhas = limpo.split("\n").map((l) => l.trim()).filter(Boolean);
  const preItens: string[] = [];
  const itens: string[] = [];
  const posItens: string[] = [];
  let fase: "pre" | "itens" | "pos" = "pre";

  for (const linha of linhas) {
    const isItem = /^(I{1,3}|IV|V{1,3}|VI{1,3}|IX|X)\s*[.\-\)]/i.test(linha);
    if (isItem) { fase = "itens"; itens.push(linha); }
    else if (fase === "itens") { fase = "pos"; posItens.push(linha); }
    else preItens.push(linha);
  }

  if (itens.length === 0) {
    return (
      <div className="space-y-1">
        {linhas.map((l, i) => <p key={i}>{l}</p>)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {preItens.length > 0 && <p className="leading-relaxed">{preItens.join(" ")}</p>}
      <div className="rounded-xl p-4 space-y-2.5"
        style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)" }}>
        {itens.map((item, i) => {
          const match = item.match(/^(I{1,3}|IV|V{1,3}|VI{1,3}|IX|X)\s*[.\-\)]\s*(.*)/i);
          if (match) {
            return (
              <div key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)", color: "#818cf8" }}>
                  {match[1].toUpperCase()}
                </span>
                <span className="text-sm leading-relaxed text-white/88 pt-0.5 flex-1">{match[2]}</span>
              </div>
            );
          }
          return <p key={i} className="text-sm text-white/80">{item}</p>;
        })}
      </div>
      {posItens.length > 0 && <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>{posItens.join(" ")}</p>}
    </div>
  );
}

// ─── Explanation formatter ───────────────────────────────────────────────────

export function ExplicacaoFormatada({ texto, compacta = false }: { texto: string; compacta?: boolean }) {
  if (!texto) return null;
  const limpo = limparMarkdown(texto);
  const linhas = limpo.split(/\n/).filter((l) => l.trim());
  type TL = "correta" | "errada" | "conceito" | "dica" | "texto";

  const partes: Array<{ tipo: TL; conteudo: string }> = linhas.map((l) => {
    const t = l.trim();
    if (t.startsWith("✅")) return { tipo: "correta", conteudo: t.replace(/^✅\s*/, "") };
    if (t.startsWith("❌")) return { tipo: "errada", conteudo: t.replace(/^❌\s*/, "") };
    if (t.startsWith("📌")) return { tipo: "conceito", conteudo: t.replace(/^📌\s*/, "") };
    if (t.startsWith("💡")) return { tipo: "dica", conteudo: t.replace(/^💡\s*/, "") };
    return { tipo: "texto", conteudo: t };
  });

  return (
    <div className="space-y-2">
      {partes.map((p, i) => {
        if (p.tipo === "correta") return (
          <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <span className="text-success text-sm shrink-0 mt-0.5">✅</span>
            <span className="text-sm leading-relaxed text-success font-medium">{p.conteudo}</span>
          </div>
        );
        if (p.tipo === "errada") return (
          <div key={i} className={`flex items-start gap-2.5 px-4 py-3 rounded-xl ${compacta ? "py-2" : ""}`}
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-white/35 text-sm shrink-0 mt-0.5">❌</span>
            <span className="text-sm leading-relaxed text-white/50">{p.conteudo}</span>
          </div>
        );
        if (p.tipo === "conceito") return (
          <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <span className="text-violet-400 text-sm shrink-0 mt-0.5">📌</span>
            <span className="text-sm leading-relaxed text-violet-300 font-semibold">{p.conteudo}</span>
          </div>
        );
        if (p.tipo === "dica") return (
          <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <span className="text-yellow-400 text-sm shrink-0 mt-0.5">💡</span>
            <span className="text-sm leading-relaxed text-yellow-300">{p.conteudo}</span>
          </div>
        );
        return <p key={i} className="text-sm leading-relaxed text-white/75 px-1">{p.conteudo}</p>;
      })}
    </div>
  );
}

// ─── Múltipla Escolha ────────────────────────────────────────────────────────

function OpcaoMultipla({ alternativa, index, respondida, selecionada, correta, revelada, onSelect, ocultas, onOcultar }: {
  alternativa: string; index: number; respondida: boolean; selecionada: string | null;
  correta: string; revelada: boolean; onSelect: (alt: string) => void;
  ocultas: Set<string>; onOcultar: (alt: string) => void;
}) {
  const letters = ["A", "B", "C", "D", "E"];
  const letter = letters[index];
  const isSelected = alternativa === selecionada;
  const isCorrect = alternativa === correta;
  const bloqueada = respondida || revelada;
  const ocultada = ocultas.has(alternativa);

  let letterBg = "bg-white/10 text-white/60";
  let borderClass = "border-white/10 hover:border-violet-500/40 hover:bg-white/5";
  let rowBg = "";
  let pulse = false;

  if (bloqueada) {
    if (isCorrect) { rowBg = "bg-success/10"; borderClass = "border-success/50"; letterBg = "bg-success/25 text-success"; pulse = true; }
    else if (isSelected && !revelada) { rowBg = "bg-destructive/10"; borderClass = "border-destructive/40"; letterBg = "bg-destructive/20 text-destructive"; }
    else { borderClass = "border-white/5 opacity-40"; }
  } else if (isSelected) {
    borderClass = "border-violet-500/60 bg-violet-500/10";
    letterBg = "bg-violet-500/30 text-violet-300";
  }

  // Se ocultada (cortada), mostra diferente
  if (ocultada && !bloqueada) {
    return (
      <div className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/5 opacity-30 line-through animate-fade-in-up`}
        style={{ animationDelay: `${index * 50}ms` }}>
        <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-white/5 text-white/30">{letter}</span>
        <span className="text-sm leading-snug flex-1 text-white/30 line-through">{stripLetraAlternativa(alternativa)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => !bloqueada && onSelect(alternativa)}
        disabled={bloqueada}
        className={`question-option flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left animate-fade-in-up opacity-0 ${rowBg} ${borderClass} ${bloqueada ? "cursor-default" : ""}`}
        style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
      >
        <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${letterBg} ${pulse ? "animate-pulse" : ""}`}>
          {letter}
        </span>
        <span className="text-sm leading-snug flex-1" style={{
          color: bloqueada && isCorrect ? "#34d399" : bloqueada && isSelected && !isCorrect && !revelada ? "#f87171" : undefined,
        }}>
          {stripLetraAlternativa(alternativa)}
        </span>
        {bloqueada && isCorrect && (
          <span className="shrink-0 flex items-center gap-1.5 text-success text-xs font-bold">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/20 border border-success/40">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            {isSelected && !revelada && <span className="hidden sm:inline">Correto!</span>}
            {revelada && <span className="hidden sm:inline">Resposta</span>}
          </span>
        )}
        {bloqueada && isSelected && !isCorrect && !revelada && (
          <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-destructive/20 border border-destructive/40 text-destructive">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
      </button>
      {/* Botão cortar alternativa */}
      {!bloqueada && !isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onOcultar(alternativa); }}
          title="Eliminar alternativa"
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive/70 hover:bg-destructive/10 transition-all border border-transparent hover:border-destructive/20"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Certo / Errado ──────────────────────────────────────────────────────────

function OpcaoCertoErrado({ alternativa, respondida, selecionada, correta, revelada, onSelect }: {
  alternativa: string; respondida: boolean; selecionada: string | null;
  correta: string; revelada: boolean; onSelect: (alt: string) => void;
}) {
  const isSelected = alternativa === selecionada;
  const isCorrect = alternativa === correta;
  const bloqueada = respondida || revelada;
  const textoLimpo = stripLetraAlternativa(alternativa);
  const isCerto = /certo|verdadeiro/i.test(textoLimpo);

  let bg = "rgba(255,255,255,0.03)";
  let border = "rgba(255,255,255,0.1)";
  let iconColor = isCerto ? "#34d399" : "#f87171";
  let textColor = "rgba(255,255,255,0.7)";
  let scale = "";

  if (!bloqueada && isSelected) {
    bg = isCerto ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)";
    border = isCerto ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)";
    textColor = "#fff"; scale = "scale-[1.02]";
  }
  if (bloqueada) {
    if (isCorrect) { bg = "rgba(52,211,153,0.12)"; border = "rgba(52,211,153,0.5)"; textColor = "#34d399"; }
    else if (isSelected && !revelada) { bg = "rgba(248,113,113,0.12)"; border = "rgba(248,113,113,0.4)"; textColor = "#f87171"; }
    else { bg = "rgba(255,255,255,0.01)"; border = "rgba(255,255,255,0.05)"; textColor = "rgba(255,255,255,0.3)"; iconColor = "rgba(255,255,255,0.2)"; }
  }

  return (
    <button onClick={() => !bloqueada && onSelect(alternativa)} disabled={bloqueada}
      className={`flex-1 flex flex-col items-center gap-3 py-6 px-4 rounded-2xl border-2 transition-all duration-250 ${scale} ${bloqueada ? "cursor-default" : "hover:scale-[1.02] active:scale-[0.98]"}`}
      style={{ background: bg, borderColor: border }}>
      <span className="text-3xl" style={{ color: iconColor }}>{isCerto ? "✓" : "✗"}</span>
      <span className="text-base font-bold" style={{ color: textColor }}>{textoLimpo.charAt(0).toUpperCase() + textoLimpo.slice(1)}</span>
      {bloqueada && isCorrect && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(52,211,153,0.2)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}>
          {revelada ? "Resposta correta" : "Correto! ✓"}
        </span>
      )}
      {bloqueada && isSelected && !isCorrect && !revelada && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(248,113,113,0.2)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}>Incorreto</span>
      )}
    </button>
  );
}

// ─── Associação / Julgamento ─────────────────────────────────────────────────

function QuestaoAssociacao({ alternativas, correta, respondida, selecionada, revelada, onSelect }: {
  alternativas: string[]; correta: string; respondida: boolean; selecionada: string | null;
  revelada: boolean; onSelect: (alt: string) => void;
}) {
  const bloqueada = respondida || revelada;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-indigo-400 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>🔗 Associação / Julgamento</span>
      </div>
      {alternativas.map((alt, i) => {
        const letters = ["A", "B", "C", "D", "E"];
        const letter = letters[i];
        const isSelected = alt === selecionada;
        const isCorrect = alt === correta;
        const textoLimpo = stripLetraAlternativa(alt);

        let bg = "rgba(255,255,255,0.02)";
        let border = "rgba(255,255,255,0.08)";
        let letterStyle = { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" };
        let textColor = "rgba(255,255,255,0.75)";

        if (!bloqueada && isSelected) { bg = "rgba(99,102,241,0.12)"; border = "rgba(99,102,241,0.5)"; letterStyle = { bg: "rgba(99,102,241,0.25)", color: "#818cf8" }; textColor = "#fff"; }
        if (bloqueada) {
          if (isCorrect) { bg = "rgba(52,211,153,0.08)"; border = "rgba(52,211,153,0.4)"; letterStyle = { bg: "rgba(52,211,153,0.2)", color: "#34d399" }; textColor = "#34d399"; }
          else if (isSelected && !revelada) { bg = "rgba(248,113,113,0.08)"; border = "rgba(248,113,113,0.35)"; letterStyle = { bg: "rgba(248,113,113,0.2)", color: "#f87171" }; textColor = "#f87171"; }
          else { border = "rgba(255,255,255,0.04)"; textColor = "rgba(255,255,255,0.3)"; letterStyle = { bg: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)" }; }
        }

        return (
          <button key={i} onClick={() => !bloqueada && onSelect(alt)} disabled={bloqueada}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left animate-fade-in-up opacity-0 ${bloqueada ? "cursor-default" : "hover:border-indigo-500/40 hover:bg-white/5"}`}
            style={{ background: bg, borderColor: border, animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}>
            <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: letterStyle.bg, color: letterStyle.color }}>{letter}</span>
            <span className="text-sm leading-snug flex-1" style={{ color: textColor }}>{textoLimpo}</span>
            {bloqueada && isCorrect && (
              <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.4)" }}>
                <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            {bloqueada && isSelected && !isCorrect && !revelada && (
              <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-destructive"
                style={{ background: "rgba(248,113,113,0.2)", border: "1px solid rgba(248,113,113,0.4)" }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Banner de resultado ──────────────────────────────────────────────────────

export function ResultBanner({ acertou, revelada }: { acertou: boolean | null; revelada: boolean }) {
  if (acertou === null && !revelada) return null;
  if (revelada && acertou === null) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 animate-scale-in"
        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}>
        <span className="text-xl">👁️</span>
        <div>
          <p className="text-sm font-bold text-indigo-300">Resposta revelada</p>
          <p className="text-xs text-muted-foreground mt-0.5">Veja o gabarito comentado abaixo. Esta questão não foi contabilizada.</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 animate-scale-in ${acertou ? "bg-success/15 border border-success/30" : "bg-destructive/15 border border-destructive/30"}`}>
      <span className="text-xl">{acertou ? "🎉" : "❌"}</span>
      <div>
        <p className={`text-sm font-bold ${acertou ? "text-success" : "text-destructive"}`}>{acertou ? "Resposta Correta!" : "Resposta Incorreta"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{acertou ? "Ótimo trabalho! Continue assim." : "Veja o gabarito comentado abaixo."}</p>
      </div>
    </div>
  );
}

// ─── Componente principal QuestaoCard ────────────────────────────────────────

export interface QuestaoCardProps {
  pergunta: string;
  alternativas: string[];
  correta: string;
  explicacao: string;
  tipo: "simples" | "elaborada";
  assuntoTitulo: string;
  indice: number;
  totalQuestoes: string;
  onResponder: (alternativa: string) => void;
  onProxima: () => void;
  onPular: () => void;
  onMostrarResposta: () => void;
  onGerarReforco?: () => void;
  respondida: boolean;
  acertouAtual: boolean | null;
  gerandoReforco?: boolean;
  reforcoGerado?: boolean;
  podePular: boolean;
  temProxima: boolean;
  carregandoMais?: boolean;
}

const QuestaoCard = ({
  pergunta, alternativas, correta, explicacao, tipo, assuntoTitulo, indice, totalQuestoes,
  onResponder, onProxima, onPular, onMostrarResposta, onGerarReforco,
  respondida, acertouAtual, gerandoReforco = false, reforcoGerado = false,
  podePular, temProxima, carregandoMais = false,
}: QuestaoCardProps) => {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [revelada, setRevelada] = useState(false);
  const [showExplicacao, setShowExplicacao] = useState(false);
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());

  const tipoQuestao = detectarTipoQuestao(alternativas, pergunta);

  useEffect(() => {
    setSelecionada(null);
    setRevelada(false);
    setShowExplicacao(false);
    setOcultas(new Set());
  }, [indice, pergunta]);

  useEffect(() => {
    if (respondida || revelada) {
      const t = setTimeout(() => setShowExplicacao(true), 300);
      return () => clearTimeout(t);
    }
  }, [respondida, revelada]);

  const handleSelect = (alt: string) => {
    if (respondida || revelada) return;
    setSelecionada(alt);
    onResponder(alt);
  };

  const handleMostrarResposta = () => {
    if (respondida) return;
    setRevelada(true);
    setShowExplicacao(true);
    onMostrarResposta();
  };

  const handleOcultarAlternativa = (alt: string) => {
    setOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(alt)) next.delete(alt);
      else next.add(alt);
      return next;
    });
  };

  const bloqueada = respondida || revelada;

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-6 animate-scale-in" style={{ border: "1px solid rgba(139,92,246,0.15)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-violet-400 text-xs font-medium"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              {assuntoTitulo} · Q{indice}
            </span>
            {tipoQuestao === "certo_errado" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}>✓✗ Certo/Errado</span>
            )}
            {tipoQuestao === "associacao" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8" }}>🔗 Associação</span>
            )}
            {tipoQuestao === "multipla" && ocultas.size > 0 && !bloqueada && (
              <button onClick={() => setOcultas(new Set())}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-all hover:opacity-80"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}>
                ✂ {ocultas.size} eliminada{ocultas.size > 1 ? "s" : ""} · restaurar
              </button>
            )}
          </div>
          {onGerarReforco && (
            <button onClick={onGerarReforco} disabled={gerandoReforco || reforcoGerado}
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
          )}
        </div>

        {/* Enunciado */}
        <div className="text-base font-medium mb-6 text-white/95" style={{ lineHeight: "1.75" }}>
          <PerguntaFormatada texto={pergunta} />
        </div>

        {/* Alternativas */}
        {tipoQuestao === "multipla" && (
          <div className="space-y-2.5">
            {alternativas.map((alt, i) => (
              <OpcaoMultipla
                key={i} alternativa={alt} index={i} respondida={respondida}
                selecionada={selecionada} correta={correta} revelada={revelada}
                onSelect={handleSelect} ocultas={ocultas} onOcultar={handleOcultarAlternativa}
              />
            ))}
          </div>
        )}

        {tipoQuestao === "certo_errado" && (
          <div className="flex gap-3 mt-2">
            {alternativas.map((alt, i) => (
              <OpcaoCertoErrado key={i} alternativa={alt} respondida={respondida}
                selecionada={selecionada} correta={correta} revelada={revelada} onSelect={handleSelect} />
            ))}
          </div>
        )}

        {tipoQuestao === "associacao" && (
          <QuestaoAssociacao alternativas={alternativas} correta={correta} respondida={respondida}
            selecionada={selecionada} revelada={revelada} onSelect={handleSelect} />
        )}

        {/* Botões de ação */}
        {!bloqueada && (
          <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
            <button onClick={handleMostrarResposta}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-indigo-500/25 bg-indigo-500/8 text-indigo-400 hover:bg-indigo-500/15 hover:border-indigo-500/45">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Ver resposta
            </button>
            {podePular && (
              <button onClick={onPular}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5 hover:border-white/20 ml-auto">
                Pular
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Área pós-resposta */}
      {bloqueada && (
        <div className="animate-fade-in-up space-y-4">
          <ResultBanner acertou={acertouAtual} revelada={revelada} />
          {showExplicacao && (
            <div className="glass rounded-2xl p-5" style={{ border: "1px solid rgba(139,92,246,0.15)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-xs">💡</div>
                <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                  {tipo === "elaborada" ? "Gabarito Comentado" : "Explicação"}
                </span>
              </div>
              <ExplicacaoFormatada texto={explicacao} />
            </div>
          )}
          <button onClick={onProxima} className="btn-primary w-full rounded-2xl py-3.5 text-sm font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
            {temProxima ? (
              <span className="flex items-center justify-center gap-2">
                Próxima questão
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">🏁 Ver Resultado</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestaoCard;