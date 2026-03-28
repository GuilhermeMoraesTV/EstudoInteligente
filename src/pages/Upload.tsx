// Módulo de Upload.
// Permite colar texto ou enviar PDF para gerar conteúdo de estudo via IA.

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { gerarConteudoEstudo } from "../services/aiService";
import {
  salvarMaterial,
  salvarQuestoes,
  salvarFlashcards,
} from "../services/firebaseService";
import Navbar from "../components/Navbar";

const Upload = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [erro, setErro] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extrai texto do PDF usando pdf.js
  const extrairTextoPDF = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    
    // Configurar worker usando CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textoCompleto = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: { str?: string }) => ("str" in item ? item.str : ""))
        .join(" ");
      textoCompleto += pageText + "\n\n";
    }

    return textoCompleto.trim();
  };

  // Lida com o upload de arquivo PDF
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setErro("Apenas arquivos PDF são aceitos.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErro("O arquivo deve ter no máximo 10 MB.");
      return;
    }

    setErro("");
    setCarregando(true);
    setProgresso("Extraindo texto do PDF...");

    try {
      const textoExtraido = await extrairTextoPDF(file);
      if (textoExtraido.length < 100) {
        setErro(
          "Não foi possível extrair texto suficiente do PDF. Verifique se o arquivo contém texto selecionável."
        );
        setCarregando(false);
        return;
      }
      setTexto(textoExtraido);
      if (!titulo) {
        setTitulo(file.name.replace(".pdf", ""));
      }
      setProgresso("");
    } catch {
      setErro("Erro ao processar o PDF. Tente colar o texto manualmente.");
    } finally {
      setCarregando(false);
    }
  };

  // Envia o texto para a IA e salva no Firebase
  const handleGerar = async () => {
    if (!usuario) return;
    if (!texto.trim() || texto.trim().length < 100) {
      setErro("O texto deve ter pelo menos 100 caracteres para gerar conteúdo de qualidade.");
      return;
    }
    if (!titulo.trim()) {
      setErro("Informe um título para o material.");
      return;
    }

    setErro("");
    setCarregando(true);
    setProgresso("Gerando questões e flashcards com IA...");

    try {
      // Gera conteúdo via IA
      const resposta = await gerarConteudoEstudo(texto);

      setProgresso("Salvando no banco de dados...");

      // Salva material
      const materialId = await salvarMaterial(
        usuario.uid,
        titulo,
        texto,
        resposta.resumo
      );

      // Salva questões
      await salvarQuestoes(usuario.uid, materialId, resposta.questoes);

      // Salva flashcards
      await salvarFlashcards(usuario.uid, materialId, resposta.flashcards);

      // Navega para o estudo das questões geradas
      navigate(`/estudo/${materialId}`);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro desconhecido.";
      setErro(`Falha ao gerar conteúdo: ${msg}`);
    } finally {
      setCarregando(false);
      setProgresso("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="text-xl font-semibold text-foreground">Novo estudo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cole um texto ou envie um PDF. A IA gerará questões e flashcards automaticamente.
        </p>

        <div className="mt-6 space-y-4">
          {/* Título */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Título do material
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Ex: Direito Administrativo — Atos Administrativos"
              disabled={carregando}
            />
          </div>

          {/* Upload de PDF */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Upload de PDF (opcional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={carregando}
              className="w-full rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/30 disabled:opacity-50"
            >
              {carregando && progresso.includes("PDF")
                ? progresso
                : "Clique para selecionar um arquivo PDF"}
            </button>
          </div>

          {/* Área de texto */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Texto para estudo
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={12}
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Cole aqui o conteúdo que deseja estudar (edital, artigo, capítulo de livro, etc.)..."
              disabled={carregando}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {texto.length} caracteres
            </p>
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {erro}
            </p>
          )}

          {/* Botão de gerar */}
          <button
            onClick={handleGerar}
            disabled={carregando || texto.trim().length < 100}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {carregando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                {progresso || "Processando..."}
              </span>
            ) : (
              "Gerar questões e flashcards"
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Upload;
