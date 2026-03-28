// Módulo de Estudo — Resolução de Questões.
// Interface limpa inspirada em provas reais com captura de tempo e feedback imediato.

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  buscarQuestoesPorMaterial,
  registrarResposta,
  Questao,
} from "../services/firebaseService";
import Navbar from "../components/Navbar";
import SmartFeedback from "../components/SmartFeedback";
import LoadingSpinner from "../components/LoadingSpinner";

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

  // Estatísticas da sessão
  const [acertos, setAcertos] = useState(0);
  const [totalRespondidas, setTotalRespondidas] = useState(0);
  const [temasErrados, setTemasErrados] = useState<string[]>([]);
  const [sessaoFinalizada, setSessaoFinalizada] = useState(false);
  const [mostrarFeedback, setMostrarFeedback] = useState(false);

  // Cronômetro por questão
  const tempoInicio = useRef<number>(Date.now());

  useEffect(() => {
    if (!usuario || !materialId) return;

    const carregar = async () => {
      try {
        const dados = await buscarQuestoesPorMaterial(usuario.uid, materialId);
        if (dados.length === 0) {
          setErro("Nenhuma questão encontrada para este material.");
        }
        setQuestoes(dados);
      } catch {
        setErro("Erro ao carregar as questões.");
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [usuario, materialId]);

  // Reinicia o cronômetro quando a questão muda
  useEffect(() => {
    tempoInicio.current = Date.now();
  }, [indiceAtual]);

  const questaoAtual = questoes[indiceAtual];

  const handleResponder = async (alternativa: string) => {
    if (respondida || !usuario || !questaoAtual?.id) return;

    setRespostaSelecionada(alternativa);
    setRespondida(true);

    const tempoGasto = Math.round((Date.now() - tempoInicio.current) / 1000);
    const acertou = alternativa === questaoAtual.correta;

    if (acertou) {
      setAcertos((prev) => prev + 1);
    } else {
      // Coleta o tema da questão errada (primeiras palavras da pergunta)
      const tema = questaoAtual.pergunta.substring(0, 60);
      setTemasErrados((prev) => [...prev, tema]);
    }
    setTotalRespondidas((prev) => prev + 1);

    // Registra no histórico
    try {
      await registrarResposta(
        usuario.uid,
        "questao",
        questaoAtual.id,
        acertou,
        tempoGasto
      );
    } catch {
      // Erro silencioso — não impede o fluxo do estudo
      console.error("Erro ao salvar resposta no histórico.");
    }
  };

  const handleProxima = () => {
    if (indiceAtual < questoes.length - 1) {
      setIndiceAtual((prev) => prev + 1);
      setRespostaSelecionada(null);
      setRespondida(false);
    } else {
      // Sessão finalizada
      setSessaoFinalizada(true);
      setMostrarFeedback(true);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <LoadingSpinner texto="Carregando questões..." />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-sm text-destructive">{erro}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  // Tela de resultado final
  if (sessaoFinalizada) {
    const taxa = totalRespondidas > 0 ? Math.round((acertos / totalRespondidas) * 100) : 0;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-12 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Sessão finalizada
          </h2>
          <div className="mt-6 rounded-lg border border-border bg-card p-6">
            <p className="text-4xl font-bold text-foreground">{taxa}%</p>
            <p className="mt-1 text-sm text-muted-foreground">de acerto</p>
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <div>
                <p className="font-semibold text-success">{acertos}</p>
                <p className="text-muted-foreground">Acertos</p>
              </div>
              <div>
                <p className="font-semibold text-destructive">
                  {totalRespondidas - acertos}
                </p>
                <p className="text-muted-foreground">Erros</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Voltar ao início
            </button>
            <button
              onClick={() => navigate("/flashcards")}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Revisar flashcards
            </button>
          </div>
        </main>

        <SmartFeedback
          taxaAcerto={taxa}
          temasErrados={temasErrados}
          visivel={mostrarFeedback}
          onFechar={() => setMostrarFeedback(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Progresso */}
        <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Questão {indiceAtual + 1} de {questoes.length}
          </span>
          <span>
            {acertos}/{totalRespondidas} acertos
          </span>
        </div>

        {/* Barra de progresso */}
        <div className="mb-8 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${((indiceAtual + 1) / questoes.length) * 100}%`,
            }}
          />
        </div>

        {/* Enunciado */}
        <div className="mb-6">
          <p className="text-sm leading-relaxed text-foreground">
            {questaoAtual?.pergunta}
          </p>
        </div>

        {/* Alternativas */}
        <div className="space-y-2">
          {questaoAtual?.alternativas.map((alt, index) => {
            let estilo = "border-border bg-card hover:bg-accent/50";

            if (respondida) {
              if (alt === questaoAtual.correta) {
                estilo = "border-success/50 bg-success/10 text-success";
              } else if (alt === respostaSelecionada && alt !== questaoAtual.correta) {
                estilo = "border-destructive/50 bg-destructive/10 text-destructive";
              } else {
                estilo = "border-border bg-card opacity-50";
              }
            } else if (alt === respostaSelecionada) {
              estilo = "border-primary bg-primary/5";
            }

            return (
              <button
                key={index}
                onClick={() => handleResponder(alt)}
                disabled={respondida}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all ${estilo}`}
              >
                {alt}
              </button>
            );
          })}
        </div>

        {/* Explicação (visível após responder) */}
        {respondida && (
          <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Explicação
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {questaoAtual?.explicacao}
            </p>
          </div>
        )}

        {/* Botão de próxima */}
        {respondida && (
          <button
            onClick={handleProxima}
            className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {indiceAtual < questoes.length - 1
              ? "Próxima questão"
              : "Ver resultado"}
          </button>
        )}
      </main>
    </div>
  );
};

export default Estudo;
