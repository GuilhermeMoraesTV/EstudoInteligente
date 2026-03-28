// Componente de alerta inteligente.
// Aparece após sessões de estudo com feedback personalizado da IA.

import { useState, useEffect } from "react";
import { gerarFeedbackDesempenho } from "../services/aiService";

interface SmartFeedbackProps {
  taxaAcerto: number;
  temasErrados: string[];
  visivel: boolean;
  onFechar: () => void;
}

const SmartFeedback = ({
  taxaAcerto,
  temasErrados,
  visivel,
  onFechar,
}: SmartFeedbackProps) => {
  const [feedback, setFeedback] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (visivel) {
      setCarregando(true);
      gerarFeedbackDesempenho(taxaAcerto, temasErrados)
        .then(setFeedback)
        .catch(() =>
          setFeedback("Continue praticando! A consistência é essencial.")
        )
        .finally(() => setCarregando(false));
    }
  }, [visivel, taxaAcerto, temasErrados]);

  if (!visivel) return null;

  // Cor do indicador baseada no desempenho
  const corBarra =
    taxaAcerto >= 70
      ? "bg-success"
      : taxaAcerto >= 40
      ? "bg-warning"
      : "bg-destructive";

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-lg border border-border bg-card p-4 shadow-lg">
        {/* Barra de progresso colorida */}
        <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${corBarra}`}
            style={{ width: `${taxaAcerto}%` }}
          />
        </div>

        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Feedback do Agente
          </span>
          <span className="text-xs font-semibold text-foreground">
            {taxaAcerto}% de acerto
          </span>
        </div>

        {carregando ? (
          <div className="flex items-center gap-2 py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            <span className="text-sm text-muted-foreground">
              Analisando desempenho...
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {feedback}
          </p>
        )}

        <button
          onClick={onFechar}
          className="mt-3 w-full rounded-md bg-secondary py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
        >
          Entendi
        </button>
      </div>
    </div>
  );
};

export default SmartFeedback;
