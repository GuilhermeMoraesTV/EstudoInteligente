// Barra de navegação superior minimalista.

import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
  const { sair } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { label: "Início", path: "/" },
    { label: "Novo estudo", path: "/upload" },
    { label: "Flashcards", path: "/flashcards" },
  ];

  const handleSair = async () => {
    await sair();
    navigate("/login");
  };

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate("/")}
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          StudyAgent
        </button>

        <div className="flex items-center gap-1">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                location.pathname === link.path
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </button>
          ))}

          <button
            onClick={handleSair}
            className="ml-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
