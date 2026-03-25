//src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { OsgbAccessGate } from "@/components/OsgbAccessGate";
import { RouteTimingObserver } from "@/components/RouteTimingObserver";
import { ThemeProvider } from "@/components/theme-provider";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import BoardMeetings from "@/pages/BoardMeetings";
import BoardMeetingForm from "@/pages/BoardMeetingForm";
import BoardMeetingView from "@/pages/BoardMeetingView";
import BoardMeetingsGuide from "@/pages/BoardMeetingsGuide";
import NotificationCenter from "@/pages/NotificationCenter";
import AuthCallback from '@/pages/AuthCallback';
import Index from '@/pages/Index';
import ISGBotDeleted from "./pages/ISGBotDeleted";
import EmailHistory from "@/pages/EmailHistory";

// ============================================
// CORE PAGES
// ============================================
const Dashboard = lazyWithRetry("dashboard", () => import("./pages/Dashboard"));
const Inspections = lazyWithRetry("inspections", () => import("./pages/Inspections"));
const FormBuilder = lazyWithRetry("form-builder", () => import("./pages/FormBuilder"));
const Reports = lazyWithRetry("reports", () => import("./pages/Reports"));
const CAPA = lazyWithRetry("capa", () => import("./pages/CAPA"));
const BulkCAPA = lazyWithRetry("bulk-capa", () => import("./pages/BulkCAPA"));
const BulkCAPAHowTo = lazyWithRetry("bulk-capa-how-to", () => import("./pages/BulkCAPAHowTo"));
const IncidentManagement = lazyWithRetry("incident-management", () => import("./pages/IncidentManagement"));
const SafetyLibrary = lazyWithRetry("safety-library", () => import("./pages/SafetyLibrary"));
const SafetyLibraryGuide = lazyWithRetry("safety-library-guide", () => import("./pages/SafetyLibraryGuide"));
const Settings = lazyWithRetry("settings", () => import("./pages/Settings"));
const Profile = lazyWithRetry("profile", () => import("./pages/Profile"));
const CompanyManager = lazyWithRetry("company-manager", () => import("./pages/CompanyManager"));
const AssignmentLetters = lazyWithRetry("assignment-letters", () => import("./pages/AssignmentLetters"));
const OSGBModule = lazyWithRetry("osgb-module", () => import("./pages/OSGBModule"));
const OSGBDashboard = lazyWithRetry("osgb-dashboard", () => import("./pages/OSGBDashboard"));
const OSGBPersonnel = lazyWithRetry("osgb-personnel", () => import("./pages/OSGBPersonnel"));
const OSGBAssignments = lazyWithRetry("osgb-assignments", () => import("./pages/OSGBAssignments"));
const OSGBCompanyTracking = lazyWithRetry("osgb-company-tracking", () => import("./pages/OSGBCompanyTracking"));
const OSGBCapacity = lazyWithRetry("osgb-capacity", () => import("./pages/OSGBCapacity"));
const OSGBAlerts = lazyWithRetry("osgb-alerts", () => import("./pages/OSGBAlerts"));
const OSGBFinance = lazyWithRetry("osgb-finance", () => import("./pages/OSGBFinance"));
const OSGBDocuments = lazyWithRetry("osgb-documents", () => import("./pages/OSGBDocuments"));
const OSGBTasks = lazyWithRetry("osgb-tasks", () => import("./pages/OSGBTasks"));
const OSGBNotes = lazyWithRetry("osgb-notes", () => import("./pages/OSGBNotes"));
const OSGBAnalytics = lazyWithRetry("osgb-analytics", () => import("./pages/OSGBAnalytics"));
const CertificatesDashboard = lazyWithRetry("certificates-dashboard", () => import("./pages/CertificatesDashboard"));
const CertificatesHistory = lazyWithRetry("certificates-history", () => import("./pages/CertificatesHistory"));
const CertificateJobDetail = lazyWithRetry("certificate-job-detail", () => import("./pages/CertificateJobDetail"));
const CertificateVerifyPage = lazyWithRetry("certificate-verify", () => import("./pages/CertificateVerifyPage"));
const Auth = lazyWithRetry("auth", () => import("./pages/Auth"));
const NotFound = lazyWithRetry("not-found", () => import("./pages/NotFound"));
const ISGBotSetup = lazyWithRetry("isg-bot-setup", () => import("@/pages/ISGBotSetup"));
const ISGBot = lazyWithRetry("isg-bot", () => import("@/pages/ISGBot"));
// ✅ NACE Module Pages
const NaceHazardQuery = lazyWithRetry("nace-hazard-query", () => import("@/components/nace/NaceHazardQuery"));
const NaceSectorList = lazyWithRetry("nace-sector-list", () => import("@/components/nace/NaceSectorList"));

// ============================================
// RISK ASSESSMENT
// ============================================

const RiskAssessmentWizard = lazyWithRetry("risk-assessment-wizard", () => import("@/components/RiskAssessmentWizard"));
const RiskAssessmentEditor = lazyWithRetry("risk-assessment-editor", () => import("@/pages/RiskAssessmentEditor"));
const RiskAssessments = lazyWithRetry("risk-assessments", () => import("@/pages/RiskAssessments"));

// ============================================
// BLUEPRINT ANALYZER
// ============================================
const BlueprintAnalyzer = lazyWithRetry("blueprint-analyzer", () => import("@/pages/BlueprintAnalyzer"));
const BlueprintAnalyzerGuide = lazyWithRetry("blueprint-analyzer-guide", () => import("@/pages/BlueprintAnalyzerGuide"));
const EvacuationEditor = lazyWithRetry("evacuation-editor", () => import("@/pages/EvacuationEditor"));
const EvacuationHistory = lazyWithRetry("evacuation-history", () => import("@/pages/EvacuationHistory"));

// ============================================
// ✅ ADEP (Acil Durum Eylem Planı) - 13 MODÜL
// ============================================
const ADEPWizard = lazyWithRetry("adep-wizard", () => import("@/pages/ADEPWizard"));
const ADEPList = lazyWithRetry("adep-list", () => import("@/pages/ADEPList"));
const ADEPPlans = lazyWithRetry("adep-plans", () => import("@/pages/ADEPPlans"));
const ADEPPlanForm = lazyWithRetry("adep-plan-form", () => import("@/pages/ADEPPlanForm"));

// ============================================
// ANNUAL PLANS
// ============================================
const AnnualPlans = lazyWithRetry("annual-plans", () => import("@/pages/AnnualPlans"));

// ============================================
// FINDINGS & EMPLOYEES
// ============================================
const Findings = lazyWithRetry("findings", () => import("@/pages/Findings"));
const Employees = lazyWithRetry("employees", () => import("@/pages/Employees"));
const PPEManagement = lazyWithRetry("ppe-management", () => import("@/pages/PPEManagement"));
const PeriodicControls = lazyWithRetry("periodic-controls", () => import("@/pages/PeriodicControls"));
const PeriodicControlsGuide = lazyWithRetry("periodic-controls-guide", () => import("@/pages/PeriodicControlsGuide"));
const HealthSurveillance = lazyWithRetry("health-surveillance", () => import("@/pages/HealthSurveillance"));

// ============================================
// QUERY CLIENT CONFIGURATION
// ============================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

// ============================================
// PAGE LOADER COMPONENT
// ============================================
const PageLoader = () => (
  <div className="min-h-[420px] animate-pulse space-y-6 p-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-lg bg-slate-800" />
        <div className="h-4 w-40 rounded-lg bg-slate-900" />
      </div>
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 h-4 w-24 rounded bg-slate-800" />
          <div className="mb-3 h-8 w-20 rounded bg-slate-800" />
          <div className="h-3 w-28 rounded bg-slate-900" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="h-72 rounded-2xl border border-slate-800 bg-slate-900/70" />
      <div className="h-72 rounded-2xl border border-slate-800 bg-slate-900/70" />
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
      forcedTheme="dark"
      enableSystem={false}
      storageKey="denetron-theme"
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner theme="dark" />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <RouteTimingObserver />
            <Routes>
              {/* ============================================ */}
              {/* PUBLIC ROUTES */}
              {/* ============================================ */}

              <Route path="/auth" element={<Auth />} />
              <Route path="/certificate-verify/:code" element={<Suspense fallback={<PageLoader />}><CertificateVerifyPage /></Suspense>} />
              <Route
                path="/auth/login"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Auth />
                  </Suspense>
                }
              />
              <Route
                path="/auth/callback"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AuthCallback />
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
                          <Route path="/assignment-letters" element={<AssignmentLetters />} />
                          <Route path="/incidents" element={<IncidentManagement />} />
                          <Route path="/osgb" element={<OsgbAccessGate><OSGBModule /></OsgbAccessGate>} />
                          <Route path="/osgb/dashboard" element={<OsgbAccessGate><OSGBDashboard /></OsgbAccessGate>} />
                          <Route path="/osgb/personnel" element={<OsgbAccessGate><OSGBPersonnel /></OsgbAccessGate>} />
                          <Route path="/osgb/assignments" element={<OsgbAccessGate><OSGBAssignments /></OsgbAccessGate>} />
                          <Route path="/osgb/company-tracking" element={<OsgbAccessGate><OSGBCompanyTracking /></OsgbAccessGate>} />
                          <Route path="/osgb/capacity" element={<OsgbAccessGate><OSGBCapacity /></OsgbAccessGate>} />
                          <Route path="/osgb/alerts" element={<OsgbAccessGate><OSGBAlerts /></OsgbAccessGate>} />
                          <Route path="/osgb/finance" element={<OsgbAccessGate><OSGBFinance /></OsgbAccessGate>} />
                          <Route path="/osgb/documents" element={<OsgbAccessGate><OSGBDocuments /></OsgbAccessGate>} />
                          <Route path="/osgb/tasks" element={<OsgbAccessGate><OSGBTasks /></OsgbAccessGate>} />
                          <Route path="/osgb/notes" element={<OsgbAccessGate><OSGBNotes /></OsgbAccessGate>} />
                          <Route path="/osgb/analytics" element={<OsgbAccessGate><OSGBAnalytics /></OsgbAccessGate>} />
                          <Route path="/dashboard/certificates" element={<CertificatesDashboard />} />
                          <Route path="/dashboard/certificate-studio" element={<Navigate to="/dashboard/certificates?tab=templates" replace />} />
                          <Route path="/dashboard/certificates/history" element={<CertificatesHistory />} />
                          <Route path="/dashboard/certificates/:id" element={<CertificateJobDetail />} />
                          <Route path="/dashboard/profil" element={<Navigate to="/profile" replace />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/notifications" element={<NotificationCenter />} />
                          <Route path="/email-history" element={<EmailHistory />} />
                          {/* ============================================ */}
                          {/* RISK ASSESSMENTS */}
                          {/* ============================================ */}
                          <Route path="/risk-assessments" element={<RiskAssessments />} />
                          <Route path="/risk-assessments/:id" element={<RiskAssessments />} />
                          <Route path="/risk-wizard" element={<RiskAssessmentWizard />} />
                          <Route path="/risk-editor" element={<RiskAssessmentEditor />} />

                          {/* ============================================ */}
                          {/* ISG BOT */}
                          {/* ============================================ */}
                          <Route path="/isg-bot" element={<ISGBot />} />
                          <Route path="/isg-bot-deleted" element={<ISGBotDeleted />} />
                          <Route path="/isg-bot/:tab" element={<ISGBot />} />
                          <Route path="/docs/isg-bot-setup" element={<ISGBotSetup />} />

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
                          <Route path="/bulk-capa/how-to" element={<BulkCAPAHowTo />} />

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
                          <Route path="/ppe-management" element={<PPEManagement />} />
                          <Route path="/periodic-controls" element={<PeriodicControls />} />
                          <Route path="/periodic-controls/guide" element={<PeriodicControlsGuide />} />
                          <Route path="/health-surveillance" element={<HealthSurveillance />} />

                          {/* ============================================ */}
                          {/* BLUEPRINT ANALYZER */}
                          {/* ============================================ */}
                          <Route path="/blueprint-analyzer" element={<BlueprintAnalyzer />} />
                          <Route path="/blueprint-analyzer/how-to" element={<BlueprintAnalyzerGuide />} />
                          <Route path="/evacuation-editor" element={<EvacuationEditor />} />
                          <Route path="/evacuation-editor/history" element={<EvacuationHistory />} />

                          {/* ============================================ */}
                          {/* SAFETY LIBRARY */}
                          {/* ============================================ */}
                          <Route path="/safety-library" element={<SafetyLibrary />} />
                          <Route path="/safety-library/guide" element={<SafetyLibraryGuide />} />
                          {/* ✅ NACE Module Routes */}
                          <Route path="nace-query" element={<NaceHazardQuery />} />
                          <Route path="nace-query/sectors" element={<NaceSectorList />} />

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





