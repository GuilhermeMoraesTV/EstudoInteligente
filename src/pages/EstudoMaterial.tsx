import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  buscarMaterialPorId,
  buscarFlashcardsPorMaterial,
  renomearMaterial,
  renomearAssunto,
  Material,
  AssuntoSalvo,
} from "../services/firebaseService";
import Navbar from "../components/Navbar";

// ---- Inline edit field ----
const EditableTitle = ({
  value,
  onSave,
  className = "",
  inputClassName = "",
}: {
  value: string;
  onSave: (novo: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
}) => {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(value);
  const [salvando, setSalvando] = useState(false);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) { setEditando(false); setDraft(value); return; }
    setSalvando(true);
    try {
      await onSave(trimmed);
    } finally {
      setSalvando(false);
      setEditando(false);
    }
  };

  if (editando) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditando(false); setDraft(value); } }}
          className={`bg-white/10 border border-violet-500/50 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-violet-400 flex-1 ${inputClassName}`}
        />
        <button onClick={handleSave} disabled={salvando}
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-all text-xs">
          {salvando ? "…" : "✓"}
        </button>
        <button onClick={() => { setEditando(false); setDraft(value); }}
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 transition-all text-xs">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 group/edit flex-1 ${className}`}>
      <span className="flex-1">{value}</span>
      <button
        onClick={() => { setDraft(value); setEditando(true); }}
        className="opacity-0 group-hover/edit:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-muted-foreground hover:text-violet-400"
        title="Renomear"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </div>
  );
};

const EstudoMaterial = () => {
  const { materialId } = useParams<{ materialId: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [material, setMaterial] = useState<Material | null>(null);
  const [totalFlashcards, setTotalFlashcards] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!materialId || !usuario) return;
    const carregar = async () => {
      try {
        const [dados, flashcards] = await Promise.all([
          buscarMaterialPorId(materialId),
          buscarFlashcardsPorMaterial(usuario.uid, materialId),
        ]);
        setMaterial(dados);
        setTotalFlashcards(flashcards.length);
      } catch { /* silent */ }
      finally { setCarregando(false); setTimeout(() => setVisible(true), 100); }
    };
    carregar();
  }, [materialId, usuario]);

  const handleRenomearMaterial = async (novoTitulo: string) => {
    if (!material?.id) return;
    await renomearMaterial(material.id, novoTitulo);
    setMaterial((prev) => prev ? { ...prev, titulo: novoTitulo } : prev);
  };

  const handleRenomearAssunto = async (assuntoId: string, novoTitulo: string) => {
    if (!material?.id || !material.assuntos) return;
    await renomearAssunto(material.id, assuntoId, novoTitulo, material.assuntos);
    setMaterial((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        assuntos: prev.assuntos.map((a) =>
          a.id === assuntoId ? { ...a, titulo: novoTitulo } : a
        ),
      };
    });
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl animate-brain-pulse">📖</div>
          </div>
          <p className="text-muted-foreground text-sm">Carregando material...</p>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Navbar />
        <span className="text-4xl">😕</span>
        <p className="text-muted-foreground">Material não encontrado.</p>
        <button onClick={() => navigate("/estudos")} className="text-violet-400 hover:underline text-sm">← Estudos</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <Navbar />

      <main className="relative mx-auto max-w-2xl px-4 pt-24 pb-16">
        {/* Breadcrumb */}
        <div className={`mb-6 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
          <button onClick={() => navigate("/estudos")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Meus Estudos
          </button>
        </div>

        {/* Header */}
        <div className={`mb-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-2xl shadow-2xl shrink-0"
                style={{ boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}>📖</div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
                  <EditableTitle
                    value={material.titulo}
                    onSave={handleRenomearMaterial}
                    className="text-2xl font-bold text-white"
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {material.assuntos?.length || 0} assunto{(material.assuntos?.length || 0) !== 1 ? "s" : ""} · {totalFlashcards} flashcard{totalFlashcards !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => navigate(`/flashcards/material/${materialId}`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border border-blue-500/20 bg-blue-500/8 text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/15">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">Flashcards</span>
                {totalFlashcards > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">{totalFlashcards}</span>
                )}
              </button>
              <button onClick={() => navigate("/flashcards")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border border-violet-500/20 bg-violet-500/8 text-violet-400 hover:border-violet-500/40">
                🃏 <span className="hidden sm:inline">Revisar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Subjects List — vertical, nome completo */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Escolha um assunto
          </h2>
          <div className="flex flex-col gap-3">
            {(material.assuntos || []).map((assunto, idx) => (
              <div
                key={assunto.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 hover:border-violet-500/50 transition-all duration-300 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "forwards" }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.04) 100%)" }} />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative p-5 flex items-center gap-4">
                  {/* Número */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-violet-400 shrink-0"
                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
                    {idx + 1}
                  </div>

                  {/* Título editável */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm" style={{ fontFamily: "Syne, sans-serif" }}>
                      <EditableTitle
                        value={assunto.titulo}
                        onSave={(novo) => handleRenomearAssunto(assunto.id, novo)}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/15">⚡ Flash</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">🎯 Concurso</span>
                    </div>
                  </div>

                  {/* Botão estudar */}
                  <button
                    onClick={() => navigate(`/estudo/${materialId}/${assunto.id}`)}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/50"
                  >
                    Estudar
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EstudoMaterial;