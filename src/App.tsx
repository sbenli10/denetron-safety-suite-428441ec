import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Inspections from "./pages/Inspections";
import FormBuilder from "./pages/FormBuilder";
import Reports from "./pages/Reports";
import CAPA from "./pages/CAPA";
import BulkCAPA from "./pages/BulkCAPA";
import SafetyLibrary from "./pages/SafetyLibrary";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import RiskAssessmentWizard from "@/components/RiskAssessmentWizard";
import Profile from "@/pages/Profile";
import BlueprintAnalyzer from "@/pages/BlueprintAnalyzer";
import ADEPWizard from "@/pages/ADEPWizard";
import AnnualPlans from "@/pages/AnnualPlans";
import CompanyManager from "@/pages/CompanyManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/companies" element={<CompanyManager />} />
                      <Route path="/annual-plans" element={<AnnualPlans />} />
                      <Route path="/adep-wizard" element={<ADEPWizard />} />
                      <Route path="/blueprint-analyzer" element={<BlueprintAnalyzer />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/inspections" element={<Inspections />} />
                      <Route path="/form-builder" element={<FormBuilder />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/capa" element={<CAPA />} />
                      <Route path="/risk-wizard" element={<RiskAssessmentWizard />} />
                      <Route path="/bulk-capa" element={<BulkCAPA />} />
                      <Route path="/safety-library" element={<SafetyLibrary />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
