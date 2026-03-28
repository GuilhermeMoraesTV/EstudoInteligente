// Dashboard principal.
// Mostra estatísticas do usuário e acesso rápido às funcionalidades.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { calcularEstatisticas } from "../services/firebaseService";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/LoadingSpinner";

interface Estatisticas {
  totalMateriais: number;
  totalRespostas: number;
  taxaAcerto: number;
  taxaAcertoQuestoes: number;
  flashcardsPendentes: number;
}

const Dashboard = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!usuario) return;

    const carregar = async () => {
      try {
        const dados = await calcularEstatisticas(usuario.uid);
        setStats(dados);
      } catch {
        setErro("Erro ao carregar estatísticas. Verifique sua conexão.");
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [usuario]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="text-xl font-semibold text-foreground">
          Olá, {usuario?.email?.split("@")[0]}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe seu progresso e continue estudando.
        </p>

        {carregando ? (
          <LoadingSpinner texto="Carregando estatísticas..." />
        ) : erro ? (
          <p className="mt-6 text-sm text-destructive">{erro}</p>
        ) : (
          <>
            {/* Cards de estatísticas */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Materiais estudados"
                valor={stats?.totalMateriais ?? 0}
              />
              <StatCard
                label="Questões respondidas"
                valor={stats?.totalRespostas ?? 0}
              />
              <StatCard
                label="Taxa de acerto"
                valor={`${stats?.taxaAcerto ?? 0}%`}
                destaque={
                  (stats?.taxaAcerto ?? 0) >= 70
                    ? "success"
                    : (stats?.taxaAcerto ?? 0) >= 40
                    ? "warning"
                    : "destructive"
                }
              />
              <StatCard
                label="Flashcards pendentes"
                valor={stats?.flashcardsPendentes ?? 0}
                destaque={
                  (stats?.flashcardsPendentes ?? 0) > 0 ? "primary" : undefined
                }
              />
            </div>

            {/* Ações rápidas */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => navigate("/upload")}
                className="rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-primary/30 hover:bg-accent/50"
              >
                <p className="font-medium text-foreground">
                  Novo estudo
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cole um texto ou envie um PDF para gerar questões e flashcards
                </p>
              </button>

              <button
                onClick={() => navigate("/flashcards")}
                className="rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-primary/30 hover:bg-accent/50"
              >
                <p className="font-medium text-foreground">
                  Revisar flashcards
                  {(stats?.flashcardsPendentes ?? 0) > 0 && (
                    <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {stats?.flashcardsPendentes}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Revise os conceitos com repetição espaçada
                </p>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

// Card de estatística individual
const StatCard = ({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: number | string;
  destaque?: "success" | "warning" | "destructive" | "primary";
}) => {
  const corValor = destaque
    ? {
        success: "text-success",
        warning: "text-warning",
        destructive: "text-destructive",
        primary: "text-primary",
      }[destaque]
    : "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${corValor}`}>{valor}</p>
    </div>
  );
};

export default Dashboard;
