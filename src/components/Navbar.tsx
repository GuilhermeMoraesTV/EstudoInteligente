import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";

const Navbar = () => {
  const { sair, usuario } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { label: "Dashboard", path: "/", icon: "◈" },
    { label: "Estudos", path: "/estudos", icon: "📚" },
    { label: "Novo Estudo", path: "/upload", icon: "✦" },
    { label: "Flashcards", path: "/flashcards", icon: "◇" },
  ];

  const handleSair = async () => {
    await sair();
    navigate("/login");
  };

  const userInitial = usuario?.email?.charAt(0).toUpperCase() || "U";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "navbar-blur shadow-2xl" : "bg-transparent"}`}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex items-center gap-2 group">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 blur-lg opacity-40 group-hover:opacity-70 transition-opacity animate-pulse" />
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm" style={{ fontFamily: "Syne,sans-serif" }}>S</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-gradient" style={{ fontFamily: "Syne, sans-serif" }}>
              Estudo Inteligente
            </span>
          </button>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = isActive(link.path);
              return (
                <button key={link.path} onClick={() => navigate(link.path)}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 group ${active ? "text-white" : "text-muted-foreground hover:text-white"}`}>
                  {active && <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600/30 to-indigo-600/30 border border-violet-500/30" />}
                  <span className={`text-xs ${active ? "text-violet-400" : "text-muted-foreground group-hover:text-violet-400"} transition-colors`}>
                    {link.icon}
                  </span>
                  <span className="relative">{link.label}</span>
                  {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />}
                </button>
              );
            })}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-lg"
                style={{ boxShadow: "0 0 15px rgba(139,92,246,0.4)" }}>
                {userInitial}
              </div>
            </div>
            <button onClick={handleSair}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </button>

            {/* Mobile menu button */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden transition-all duration-300 overflow-hidden ${menuOpen ? "max-h-72 pb-4" : "max-h-0"}`}>
          <div className="glass rounded-2xl p-2 mt-2 space-y-1">
            {links.map((link) => {
              const active = isActive(link.path);
              return (
                <button key={link.path} onClick={() => { navigate(link.path); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${active ? "bg-violet-600/20 text-white border border-violet-500/30" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}>
                  <span className="text-violet-400">{link.icon}</span>
                  {link.label}
                </button>
              );
            })}
            <button onClick={handleSair}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;