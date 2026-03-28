// Módulo de Revisão — Flashcards com repetição espaçada.
// Interação fluida com botões de autoavaliação.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  buscarFlashcardsPendentes,
  atualizarFlashcard,
  registrarResposta,
  Flashcard,
} from "../services/firebaseService";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/LoadingSpinner";

const Flashcards = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [mostrarVerso, setMostrarVerso] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [revisados, setRevisados] = useState(0);

  useEffect(() => {
    if (!usuario) return;

    const carregar = async () => {
      try {
        const dados = await buscarFlashcardsPendentes(usuario.uid);
        setFlashcards(dados);
      } catch {
        setErro("Erro ao carregar flashcards.");
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [usuario]);

  const flashcardAtual = flashcards[indiceAtual];

  const handleAvaliacao = async (qualidade: number) => {
    if (!usuario || !flashcardAtual?.id) return;

    const acertou = qualidade > 0;

    try {
      // Atualiza parâmetros de repetição espaçada
      await atualizarFlashcard(flashcardAtual.id, qualidade);

      // Registra no histórico
      await registrarResposta(
        usuario.uid,
        "flashcard",
        flashcardAtual.id,
        acertou,
        0
      );
    } catch {
      console.error("Erro ao salvar avaliação do flashcard.");
    }

    setRevisados((prev) => prev + 1);
    setMostrarVerso(false);

    if (indiceAtual < flashcards.length - 1) {
      setIndiceAtual((prev) => prev + 1);
    } else {
      // Todos revisados
      setIndiceAtual(flashcards.length);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <LoadingSpinner texto="Carregando flashcards..." />
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

  // Nenhum flashcard pendente
  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-lg font-medium text-foreground">
            Nenhum flashcard pendente
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Envie um novo material para gerar flashcards, ou aguarde a data de revisão dos existentes.
          </p>
          <button
            onClick={() => navigate("/upload")}
            className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Novo estudo
          </button>
        </div>
      </div>
    );
  }

  // Todos revisados
  if (indiceAtual >= flashcards.length) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-lg font-medium text-foreground">
            Revisão concluída!
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Você revisou {revisados} flashcard{revisados !== 1 ? "s" : ""} nesta sessão.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-lg px-4 py-8">
        {/* Progresso */}
        <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Card {indiceAtual + 1} de {flashcards.length}
          </span>
          <span>{revisados} revisados</span>
        </div>

        {/* Barra de progresso */}
        <div className="mb-8 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${((indiceAtual + 1) / flashcards.length) * 100}%`,
            }}
          />
        </div>

        {/* Card */}
        <div
          onClick={() => !mostrarVerso && setMostrarVerso(true)}
          className={`cursor-pointer rounded-xl border border-border bg-card p-8 text-center transition-all duration-200 ${
            !mostrarVerso ? "hover:border-primary/30 hover:shadow-sm" : ""
          }`}
          style={{ minHeight: "200px" }}
        >
          <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {mostrarVerso ? "Resposta" : "Conceito"}
          </p>
          <p className="text-lg leading-relaxed text-foreground">
            {mostrarVerso ? flashcardAtual?.verso : flashcardAtual?.frente}
          </p>

          {!mostrarVerso && (
            <p className="mt-6 text-xs text-muted-foreground">
              Toque para revelar a resposta
            </p>
          )}
        </div>

        {/* Botões de autoavaliação */}
        {mostrarVerso && (
          <div className="mt-6 grid grid-cols-3 gap-2">
            <button
              onClick={() => handleAvaliacao(0)}
              className="rounded-lg border border-destructive/30 bg-destructive/5 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              Errei
            </button>
            <button
              onClick={() => handleAvaliacao(1)}
              className="rounded-lg border border-warning/30 bg-warning/5 py-3 text-sm font-medium text-warning transition-colors hover:bg-warning/10"
            >
              Difícil
            </button>
            <button
              onClick={() => handleAvaliacao(2)}
              className="rounded-lg border border-success/30 bg-success/5 py-3 text-sm font-medium text-success transition-colors hover:bg-success/10"
            >
              Fácil
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Flashcards;
