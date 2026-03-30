import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const [ehCadastro, setEhCadastro] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<Array<{x:number,y:number,s:number,d:number,c:string}>>([]);

  const { cadastrar, entrar } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    const colors = ["#a78bfa", "#818cf8", "#60a5fa", "#34d399", "#c4b5fd"];
    setParticles(Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: Math.random() * 3 + 1,
      d: Math.random() * 4 + 2,
      c: colors[Math.floor(Math.random() * colors.length)],
    })));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      if (ehCadastro) {
        if (!nome.trim()) { setErro("Informe seu nome."); setCarregando(false); return; }
        await cadastrar(email, senha, nome);
      } else {
        await entrar(email, senha);
      }
      navigate("/");
    } catch (error: unknown) {
      const mensagem = error instanceof Error ? error.message : "Erro desconhecido.";
      if (mensagem.includes("auth/email-already-in-use")) setErro("Este e-mail já está cadastrado.");
      else if (mensagem.includes("auth/weak-password")) setErro("A senha deve ter pelo menos 6 caracteres.");
      else if (mensagem.includes("auth/invalid-email")) setErro("E-mail inválido.");
      else if (mensagem.includes("auth/wrong-password") || mensagem.includes("auth/user-not-found") || mensagem.includes("auth/invalid-credential"))
        setErro("E-mail ou senha incorretos.");
      else setErro("Ocorreu um erro. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4">
      {/* Background */}
      <div className="fixed inset-0 grid-pattern opacity-20" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-600/8 rounded-full blur-[160px]" />

      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.s}px`,
            height: `${p.s}px`,
            background: p.c,
            boxShadow: `0 0 ${p.s * 4}px ${p.c}`,
            animation: `particle-float ${p.d}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}

      <div className="relative w-full max-w-md">
        {/* Logo area */}
        <div
          className={`text-center mb-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"}`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 mb-4 shadow-2xl animate-float"
            style={{ boxShadow: "0 0 50px rgba(139,92,246,0.5)" }}>
            <span className="text-3xl">🧠</span>
          </div>
          <h1
            className="text-3xl font-bold text-gradient"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Estudo Inteligente
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gerador inteligente de questões e flashcards
          </p>
        </div>

        {/* Card */}
        <div
          className={`glass-strong rounded-3xl p-8 transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ border: "1px solid rgba(139,92,246,0.2)" }}
        >
          {/* Tab switcher */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            {[
              { label: "Entrar", active: !ehCadastro },
              { label: "Cadastrar", active: ehCadastro },
            ].map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => { setEhCadastro(i === 1); setErro(""); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                  tab.active
                    ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-lg"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {ehCadastro && (
              <div className="animate-fade-in-up">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Nome completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 outline-none transition-all focus:border-violet-500/60 focus:bg-white/8 focus:ring-1 focus:ring-violet-500/30"
                    placeholder="Seu nome"
                    required={ehCadastro}
                    disabled={carregando}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 outline-none transition-all focus:border-violet-500/60 focus:bg-white/8 focus:ring-1 focus:ring-violet-500/30"
                placeholder="seu@email.com"
                required
                disabled={carregando}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 outline-none transition-all focus:border-violet-500/60 focus:bg-white/8 focus:ring-1 focus:ring-violet-500/30"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                disabled={carregando}
              />
            </div>

            {erro && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 animate-scale-in">
                <svg className="w-4 h-4 text-destructive shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-destructive">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              {carregando ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="flex gap-1">
                    <div className="ai-loading-dot" />
                    <div className="ai-loading-dot" />
                    <div className="ai-loading-dot" />
                  </div>
                  Aguarde...
                </span>
              ) : ehCadastro ? (
                "Criar conta →"
              ) : (
                "Entrar →"
              )}
            </button>
          </form>
        </div>

        {/* Features */}
        <div
          className={`mt-6 grid grid-cols-3 gap-3 transition-all duration-700 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          {[
            { icon: "🤖", label: "IA Gemini" },
            { icon: "🎯", label: "Concursos" },
            { icon: "🃏", label: "Repetição espaçada" },
          ].map((f) => (
            <div key={f.label} className="glass rounded-xl p-3 text-center">
              <span className="text-lg">{f.icon}</span>
              <p className="text-[10px] text-muted-foreground mt-1">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;