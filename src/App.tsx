import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Index from "./pages/Index";
import Processos from "./pages/Processos";
import ProcessoDetail from "./pages/ProcessoDetail";
import Prazos from "./pages/Prazos";

import Clientes from "./pages/Clientes";
import Utilitarios from "./pages/Utilitarios";
import Relatorios from "./pages/Relatorios";
import Kanban from "./pages/Kanban";
import MinhasTarefas from "./pages/MinhasTarefas";
import Auditoria from "./pages/Auditoria";
import Equipe from "./pages/Equipe";
import AdvogadoDashboard from "./pages/AdvogadoDashboard";
import Configuracoes from "./pages/Configuracoes";
import EmailConfig from "./pages/EmailConfig";
import Mensagens from "./pages/Mensagens";
import Notifications from "./pages/Notifications";
import Email from "./pages/Email";
import Workflows from "./pages/Workflows";
import WorkflowDetail from "./pages/WorkflowDetail";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeContextProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <PermissionsProvider>
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Cadastro />} />

                    {/* Protected routes */}
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/processos" element={<ProtectedRoute><Processos /></ProtectedRoute>} />
                    <Route path="/processos/:id" element={<ProtectedRoute><ProcessoDetail /></ProtectedRoute>} />
                    <Route path="/prazos" element={<ProtectedRoute><Prazos /></ProtectedRoute>} />

                    <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
                    <Route path="/utilitarios" element={<ProtectedRoute><Utilitarios /></ProtectedRoute>} />
                    <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
                    <Route path="/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
                    <Route path="/minhas-tarefas" element={<ProtectedRoute><MinhasTarefas /></ProtectedRoute>} />
                    <Route path="/auditoria" element={<ProtectedRoute><Auditoria /></ProtectedRoute>} />
                    <Route path="/equipe" element={<ProtectedRoute><Equipe /></ProtectedRoute>} />
                    <Route path="/advogado/:id" element={<ProtectedRoute><AdvogadoDashboard /></ProtectedRoute>} />
                    <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                    <Route path="/configuracoes/email" element={<ProtectedRoute><EmailConfig /></ProtectedRoute>} />
                    <Route path="/mensagens" element={<ProtectedRoute><Mensagens /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                    <Route path="/email" element={<ProtectedRoute><Email /></ProtectedRoute>} />
                    <Route path="/workflows" element={<ProtectedRoute><Workflows /></ProtectedRoute>} />
                    <Route path="/workflows/:id" element={<ProtectedRoute><WorkflowDetail /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
            </PermissionsProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeContextProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
