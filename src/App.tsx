//src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import BoardMeetings from "@/pages/BoardMeetings";
import BoardMeetingForm from "@/pages/BoardMeetingForm";
import BoardMeetingView from "@/pages/BoardMeetingView";
import BoardMeetingsGuide from "@/pages/BoardMeetingsGuide";
import NotificationCenter from "@/pages/NotificationCenter";

// ============================================
// CORE PAGES
// ============================================
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inspections = lazy(() => import("./pages/Inspections"));
const FormBuilder = lazy(() => import("./pages/FormBuilder"));
const Reports = lazy(() => import("./pages/Reports"));
const CAPA = lazy(() => import("./pages/CAPA"));
const BulkCAPA = lazy(() => import("./pages/BulkCAPA"));
const SafetyLibrary = lazy(() => import("./pages/SafetyLibrary"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const CompanyManager = lazy(() => import("./pages/CompanyManager"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ISGBotSetup = lazy(() => import("@/pages/ISGBotSetup"));
const ISGBot = lazy(() => import("@/pages/ISGBot"));

// ============================================
// RISK ASSESSMENT
// ============================================
const RiskAssessmentWizard = lazy(() => import("@/components/RiskAssessmentWizard"));
const RiskAssessmentEditor = lazy(() => import("@/pages/RiskAssessmentEditor"));
const RiskAssessments = lazy(() => import("@/pages/RiskAssessments"));

// ============================================
// BLUEPRINT ANALYZER
// ============================================
const BlueprintAnalyzer = lazy(() => import("@/pages/BlueprintAnalyzer"));

// ============================================
// ✅ ADEP (Acil Durum Eylem Planı) - 13 MODÜL
// ============================================
const ADEPWizard = lazy(() => import("@/pages/ADEPWizard"));
const ADEPList = lazy(() => import("@/pages/ADEPList"));
const ADEPPlans = lazy(() => import("@/pages/ADEPPlans"));
const ADEPPlanForm = lazy(() => import("@/pages/ADEPPlanForm"));

// ============================================
// ANNUAL PLANS
// ============================================
const AnnualPlans = lazy(() => import("@/pages/AnnualPlans"));

// ============================================
// FINDINGS & EMPLOYEES
// ============================================
const Findings = lazy(() => import("@/pages/Findings"));
const Employees = lazy(() => import("@/pages/Employees"));

// ============================================
// QUERY CLIENT CONFIGURATION
// ============================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================
// PAGE LOADER COMPONENT
// ============================================
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-primary/20" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-semibold text-foreground">Yükleniyor...</p>
        <p className="text-xs text-muted-foreground">Lütfen bekleyin</p>
      </div>
    </div>
  </div>
);

// ============================================
// MAIN APP COMPONENT
// ============================================
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="denetron-theme"
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner theme="system" />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <Routes>
              {/* ============================================ */}
              {/* PUBLIC ROUTES */}
              {/* ============================================ */}
              <Route
                path="/auth"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Auth />
                  </Suspense>
                }
              />

              {/* ============================================ */}
              {/* PROTECTED ROUTES */}
              {/* ============================================ */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          {/* ============================================ */}
                          {/* DASHBOARD */}
                          {/* ============================================ */}
                          <Route path="/" element={<Dashboard />} />

                          {/* ============================================ */}
                          {/* PROFILE & SETTINGS */}
                          {/* ============================================ */}
                          <Route path="/companies" element={<CompanyManager />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/notifications" element={<NotificationCenter />} />

                          {/* ============================================ */}
                          {/* RISK ASSESSMENTS */}
                          {/* ============================================ */}
                          <Route path="/risk-assessments" element={<RiskAssessments />} />
                          <Route path="/risk-assessments/:id" element={<RiskAssessments />} />
                          <Route path="/risk-wizard" element={<RiskAssessmentWizard />} />
                          <Route path="/risk-editor" element={<RiskAssessmentEditor />} />

                          <Route path="/isg-bot" element={<ISGBot />} />
                          <Route path="/isg-bot/:tab" element={<ISGBot />} />

                          {/* ============================================ */}
                          {/* FINDINGS */}
                          {/* ============================================ */}
                          <Route path="/findings" element={<Findings />} />
                          <Route path="/findings/:id" element={<Findings />} />

                          {/* ============================================ */}
                          {/* INSPECTIONS */}
                          {/* ============================================ */}
                          <Route path="/inspections" element={<Inspections />} />
                          <Route path="/form-builder" element={<FormBuilder />} />

                          {/* ============================================ */}
                          {/* REPORTS */}
                          {/* ============================================ */}
                          <Route path="/reports" element={<Reports />} />

                          {/* ============================================ */}
                          {/* CAPA */}
                          {/* ============================================ */}
                          <Route path="/capa" element={<CAPA />} />
                          <Route path="/bulk-capa" element={<BulkCAPA />} />

                          {/* ============================================ */}
                          {/* BOARD MEETINGS */}
                          {/* ============================================ */}
                          <Route path="/board-meetings" element={<BoardMeetings />} />
                          <Route path="/board-meetings/new" element={<BoardMeetingForm />} />
                          <Route path="/board-meetings/:id" element={<BoardMeetingView />} />
                          <Route path="/board-meetings/:id/edit" element={<BoardMeetingForm />} />
                          <Route path="/board-meetings/guide" element={<BoardMeetingsGuide />} />

                          {/* ============================================ */}
                          {/* ✅ ADEP PLANS (13 MODÜL - AI POWERED) */}
                          {/* ============================================ */}
                          {/* Main Wizard - 13 Step Process */}
                          <Route path="/adep-wizard" element={<ADEPWizard />} />

                          {/* Plan List & Management */}
                          <Route path="/adep-plans" element={<ADEPPlans />} />
                          <Route path="/adep-list" element={<ADEPList />} />

                          {/* Plan CRUD Operations */}
                          <Route path="/adep-plans/new" element={<ADEPPlanForm />} />
                          <Route path="/adep-plans/:id" element={<ADEPPlanForm />} />
                          <Route path="/adep-plans/:id/edit" element={<ADEPPlanForm />} />

                          {/* ============================================ */}
                          {/* ANNUAL PLANS */}
                          {/* ============================================ */}
                          <Route path="/annual-plans" element={<AnnualPlans />} />

                          {/* ============================================ */}
                          {/* EMPLOYEES */}
                          {/* ============================================ */}
                          <Route path="/employees" element={<Employees />} />
                          <Route path="/employees/:id" element={<Employees />} />

                          {/* ============================================ */}
                          {/* BLUEPRINT ANALYZER */}
                          {/* ============================================ */}
                          <Route path="/blueprint-analyzer" element={<BlueprintAnalyzer />} />

                          {/* ============================================ */}
                          {/* SAFETY LIBRARY */}
                          {/* ============================================ */}
                          <Route path="/safety-library" element={<SafetyLibrary />} />

                          {/* ============================================ */}
                          {/* 404 NOT FOUND */}
                          {/* ============================================ */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;