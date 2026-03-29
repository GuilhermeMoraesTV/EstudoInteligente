import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { gerarConteudoEstudo } from "../services/aiService";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { salvarMaterial, salvarQuestoes, salvarFlashcards } from "../services/firebaseService";
import Navbar from "../components/Navbar";
import AILoadingScreen from "../components/AILoadingScreen";

type Fase = "idle" | "extraindo" | "gerando" | "salvando";

const Upload = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [fase, setFase] = useState<Fase>("idle");
  const [progresso, setProgresso] = useState("");
  const [erro, setErro] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extrairTextoPDF = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textoCompleto = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as any[]).filter((item) => "str" in item).map((item) => item.str).join(" ");
      textoCompleto += pageText + "\n\n";
    }
    return textoCompleto.trim();
  };

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") { setErro("Apenas arquivos PDF são aceitos."); return; }
    if (file.size > 10 * 1024 * 1024) { setErro("O arquivo deve ter no máximo 10 MB."); return; }
    setErro("");
    setCarregando(true);
    setFase("extraindo");
    setProgresso("Extraindo texto do PDF...");
    try {
      const textoExtraido = await extrairTextoPDF(file);
      if (textoExtraido.length < 100) {
        setErro("Não foi possível extrair texto suficiente do PDF.");
        setCarregando(false);
        setFase("idle");
        return;
      }
      setTexto(textoExtraido);
      setCharCount(textoExtraido.length);
      if (!titulo) setTitulo(file.name.replace(".pdf", ""));
      setProgresso("");
    } catch {
      setErro("Erro ao processar o PDF. Tente colar o texto manualmente.");
    } finally {
      setCarregando(false);
      setFase("idle");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  }, [titulo]);

  const handleGerar = async () => {
    if (!usuario) return;
    if (!texto.trim() || texto.trim().length < 100) {
      setErro("O texto deve ter pelo menos 100 caracteres.");
      return;
    }
    if (!titulo.trim()) { setErro("Informe um título para o material."); return; }

    setErro("");
    setCarregando(true);

    try {
      setFase("gerando");
      setProgresso("Analisando e gerando questões e flashcards...");
      const resposta = await gerarConteudoEstudo(texto);

      setFase("salvando");
      setProgresso("Salvando no banco de dados...");
      const materialId = await salvarMaterial(usuario.uid, titulo, texto, resposta.resumo);
      await salvarQuestoes(usuario.uid, materialId, resposta.questoes);
      await salvarFlashcards(usuario.uid, materialId, resposta.flashcards);

      navigate(`/estudo/${materialId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido.";
      setErro(`Falha ao gerar conteúdo: ${msg}`);
      setFase("idle");
    } finally {
      setCarregando(false);
    }
  };

  if (carregando && fase !== "idle") {
    return <AILoadingScreen progresso={progresso} fase={fase} />;
  }

  const charPercent = Math.min((charCount / 5000) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <main className="relative mx-auto max-w-3xl px-4 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">Nova Sessão</span>
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
            Carregue seu material de estudo
          </h1>
          <p className="mt-2 text-muted-foreground">
            A IA vai gerar questões estilo concurso e flashcards com repetição espaçada automaticamente.
          </p>
        </div>

        <div className="space-y-5">
          {/* Título */}
          <div className="animate-fade-in-up delay-100 opacity-0" style={{ animationFillMode: "forwards" }}>
            <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Título do material
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-muted-foreground/50 outline-none transition-all focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 focus:bg-white/7"
              placeholder="Ex: Direito Administrativo — Atos Administrativos"
              disabled={carregando}
            />
          </div>

          {/* PDF Drop Zone */}
          <div className="animate-fade-in-up delay-200 opacity-0" style={{ animationFillMode: "forwards" }}>
            <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Upload de PDF
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                dragOver
                  ? "border-violet-500 bg-violet-500/10 scale-[1.02]"
                  : "border-white/10 hover:border-violet-500/40 hover:bg-white/3"
              }`}
            >
              {/* Ambient glow when dragging */}
              {dragOver && (
                <div className="absolute inset-0 rounded-2xl bg-violet-500/5 animate-pulse" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${dragOver ? "bg-violet-500/20 scale-110" : "bg-white/5"}`}>
                  📄
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {dragOver ? "Solte o arquivo aqui!" : "Arraste um PDF ou clique para selecionar"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PDF até 10MB</p>
                </div>
                {!dragOver && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Selecionar arquivo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Text area */}
          <div className="animate-fade-in-up delay-300 opacity-0" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Texto para estudo
              </label>
              <span className="text-xs text-muted-foreground">
                <span className={charCount >= 100 ? "text-success" : "text-yellow-500"}>{charCount}</span>
                {" "}/ min. 100 caracteres
              </span>
            </div>
            <div className="relative">
              <textarea
                value={texto}
                onChange={(e) => { setTexto(e.target.value); setCharCount(e.target.value.length); }}
                rows={10}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm leading-relaxed text-white placeholder:text-muted-foreground/40 outline-none transition-all resize-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 focus:bg-white/7"
                placeholder="Cole aqui o conteúdo que deseja estudar (edital, artigo, capítulo de livro, legislação, etc.)..."
                disabled={carregando}
              />
              {/* Progress bar at bottom */}
              {charCount > 0 && (
                <div className="absolute bottom-3 left-5 right-5">
                  <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${charPercent}%`,
                        background: charCount >= 100 ? "linear-gradient(90deg,#34d399,#10b981)" : "linear-gradient(90deg,#fbbf24,#f59e0b)",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-3 gap-3 animate-fade-in-up delay-400 opacity-0" style={{ animationFillMode: "forwards" }}>
            {[
              { icon: "❓", label: "5 Questões", desc: "Estilo concurso" },
              { icon: "🃏", label: "10 Flashcards", desc: "Repetição espaçada" },
              { icon: "📝", label: "Resumo", desc: "Pontos principais" },
            ].map((item) => (
              <div key={item.label} className="glass rounded-xl p-3 text-center">
                <span className="text-xl">{item.icon}</span>
                <p className="text-xs font-semibold text-white mt-1" style={{ fontFamily: "Syne, sans-serif" }}>{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Error */}
          {erro && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 animate-scale-in">
              <svg className="w-4 h-4 text-destructive shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-destructive">{erro}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleGerar}
            disabled={carregando || texto.trim().length < 100}
            className="btn-primary animate-fade-in-up delay-500 opacity-0 w-full rounded-2xl py-4 text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            style={{ animationFillMode: "forwards", fontFamily: "Syne, sans-serif" }}
          >
            {carregando ? (
              <span className="flex items-center justify-center gap-3">
                <div className="flex gap-1">
                  <div className="ai-loading-dot" />
                  <div className="ai-loading-dot" />
                  <div className="ai-loading-dot" />
                </div>
                {progresso || "Processando..."}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="text-lg">🚀</span>
                Gerar com IA
              </span>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Upload;