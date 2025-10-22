import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Certificates from "./pages/Certificates";
import CsvUploads from "./pages/CsvUploads";
import Download from "./pages/Download";
import DownloadProgress from "./pages/DownloadProgress";
import History from "./pages/History";
import AccessConfig from "./pages/AccessConfig";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/certificates"} component={Certificates} />
      <Route path={"/csv-uploads"} component={CsvUploads} />
      <Route path={"/download"} component={Download} />
      <Route path={"/download-progress/:sessionId"} component={DownloadProgress} />
      <Route path={"/history"} component={History} />
      <Route path={"/access-config"} component={AccessConfig} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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

export default App;

