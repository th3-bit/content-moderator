import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./context/AuthContext";
import AuthGuard from "./components/AuthGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import AwaitingApproval from "./pages/AwaitingApproval";
import UserManagement from "./pages/UserManagement";
import ContentManagement from "./pages/ContentManagement";
import NotFound from "./pages/NotFound";
import PracticeModes from "./pages/PracticeModes";
import AiSettings from "./pages/AiSettings";
import CRM from "./pages/CRM";
import ModeratorStats from "./pages/ModeratorStats";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/awaiting-approval" element={<AuthGuard><AwaitingApproval /></AuthGuard>} />

              {/* Protected Moderator/Admin Routes */}
              <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
              <Route path="/users" element={<AuthGuard requireAdmin><UserManagement /></AuthGuard>} />
              <Route path="/crm" element={<AuthGuard><CRM /></AuthGuard>} />
              <Route path="/content" element={<AuthGuard><ContentManagement /></AuthGuard>} />
              <Route path="/practice-modes" element={<AuthGuard><PracticeModes /></AuthGuard>} />
              <Route path="/settings/ai" element={<AuthGuard><AiSettings /></AuthGuard>} />
              <Route path="/moderator-stats" element={<AuthGuard><ModeratorStats /></AuthGuard>} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
