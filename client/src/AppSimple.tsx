/**
 * App Simplificado - Apenas 3 rotas
 */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import HomeSimple from "./pages/HomeSimple";
import ConfigSimple from "./pages/ConfigSimple";
import DownloadSimple from "./pages/DownloadSimple";

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeSimple />} />
        <Route path="/config-simple" element={<ConfigSimple />} />
        <Route path="/download-simple" element={<DownloadSimple />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppSimple() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default AppSimple;

