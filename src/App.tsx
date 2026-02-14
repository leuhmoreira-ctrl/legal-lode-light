import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Processos from "./pages/Processos";
import Prazos from "./pages/Prazos";
import Tarefas from "./pages/Tarefas";
import Clientes from "./pages/Clientes";
import Utilitarios from "./pages/Utilitarios";
import Relatorios from "./pages/Relatorios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/processos" element={<Processos />} />
          <Route path="/prazos" element={<Prazos />} />
          <Route path="/tarefas" element={<Tarefas />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/utilitarios" element={<Utilitarios />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
