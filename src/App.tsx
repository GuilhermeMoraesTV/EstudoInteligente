import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import RotaProtegida from "./components/RotaProtegida";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Estudos from "./pages/Estudos";
import EstudoMaterial from "./pages/EstudoMaterial";
import Estudo from "./pages/Estudo";
import Flashcards from "./pages/Flashcards";
import FlashcardsListaMaterial from "./pages/FlashcardsListaMaterial";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Aqui foi trocado de BrowserRouter para HashRouter */}
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
            <Route path="/upload" element={<RotaProtegida><Upload /></RotaProtegida>} />
            <Route path="/estudos" element={<RotaProtegida><Estudos /></RotaProtegida>} />
            <Route path="/estudos/:materialId" element={<RotaProtegida><EstudoMaterial /></RotaProtegida>} />
            <Route path="/estudo/:materialId/:assuntoId" element={<RotaProtegida><Estudo /></RotaProtegida>} />
            <Route path="/flashcards" element={<RotaProtegida><Flashcards /></RotaProtegida>} />
            <Route path="/flashcards/material/:materialId" element={<RotaProtegida><FlashcardsListaMaterial /></RotaProtegida>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;