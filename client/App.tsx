import "./global.css";

import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { ConfirmDialogProvider } from "@/contexts/ConfirmDialogContext";
import { useSessionExpiry } from "@/shared/hooks/useSessionExpiry";
import { HealthCheckService } from "@/services/health-check.service";
import { useToast } from "@/hooks/use-toast";
import { PortalLayout } from "@/components/PortalLayout";
import { LearningSystemLayout } from "@/components/LearningSystemLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ProfileCompletionGuard } from "@/components/guards/ProfileCompletionGuard";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { DashboardRouter } from "@/components/DashboardRouter";

// Existing pages to keep
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SetPassword from "./pages/auth/SetPassword";
import ForgotPassword from "./pages/auth/ForgotPassword";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import RoleMappingSettings from "./pages/admin/RoleMappingSettings";
import ExamManagement from "./pages/admin/ExamManagement";
import ExamForm from "./pages/admin/ExamForm";
import ExamQuestionManager from "./pages/admin/ExamQuestionManager";
import UserManagement from "./pages/admin/UserManagement";
import MembershipManagement from "./pages/admin/MembershipManagement";
import CertificationManagement from "./pages/admin/CertificationManagement";
import PartnerManagement from "./pages/admin/PartnerManagement";
import UpgradeRequests from "./pages/admin/UpgradeRequests";
import PartnerDetails from "./pages/admin/partners/PartnerDetails";
import PartnerEdit from "./pages/admin/partners/PartnerEdit";
import PDCValidation from "./pages/admin/PDCValidation";

// Dashboard for testing
import IndividualDashboard from "./pages/individual/Dashboard";
import HelpCenter from "./pages/individual/HelpCenter";
import Resources from "./pages/individual/Resources";
import PDCs from "./pages/individual/PDCs";
import MyBooks from "./pages/individual/MyBooks";
import MyCertifications from "./pages/individual/MyCertifications";
import MyMembership from "./pages/individual/MyMembership";
import AuthorizedProviders from "./pages/individual/AuthorizedProviders";
import AccreditedPrograms from "./pages/individual/AccreditedPrograms";
import ProgramDetail from "./pages/public/ProgramDetail";
import VerifyCertification from "./pages/individual/VerifyCertification";
import VerifyCertificate from "./pages/VerifyCertificate";
import { PublicPageLayout } from "./components/PublicPageLayout";
import AuthDebug from "./pages/AuthDebug";
import Settings from "./pages/settings/Settings";

// Support pages
import NewTicket from "./pages/support/NewTicket";
import MyTickets from "./pages/support/MyTickets";
import TicketDetail from "./pages/support/TicketDetail";
import SupportTickets from "./pages/admin/SupportTickets";
import SupportTicketDetail from "./pages/admin/SupportTicketDetail";

// Mock Exam pages
import { MockExamList, ExamDetail, TakeExam, ExamResults } from "./pages/mock-exams";

// Curriculum pages
import { MyCurriculum, ModuleViewer, LessonViewer } from "@/features/curriculum";
import { CurriculumModuleManager, AccessManagement, LessonManager, LessonQuizManager } from "@/features/curriculum/admin";

// Learning System pages
import { LearningSystemDashboard } from "@/features/learning-system";
import { CompetencyAnalyticsPage } from "@/features/competency-analytics";
import { QuestionBankDashboard, PracticeSession } from "@/features/question-bank";
import { FlashcardsDashboard, FlashcardStudySession } from "@/features/flashcards";

// Question Bank Admin pages
import { QuestionBankManager, QuestionSetEditor } from "@/features/question-bank/admin";

// Flashcards Admin pages
import { FlashcardManager, FlashcardDeckEditor } from "@/features/flashcards/admin";

// Quiz Admin pages
import { QuizManager } from "@/features/quiz/admin/QuizManager";
import { QuizEditor } from "@/features/quiz/admin/QuizEditor";
import { QuestionEditor } from "@/features/quiz/admin/QuestionEditor";

// Certification Exam pages
import ExamApplications from "./pages/certification/ExamApplications";
import DistributeVouchers from "./pages/certification/DistributeVouchers";
import CertExamDetail from "./pages/certification/ExamDetail";
import TakeCertExam from "./pages/certification/TakeExam";
import CertExamResults from "./pages/certification/ExamResults";
import TakeCertificationExam from "./pages/certification/TakeCertificationExam";
import TakeCertificationExamAttempt from "./pages/certification/TakeCertificationExamAttempt";
import ScheduleExam from "./pages/ScheduleExam";
import ExamLaunch from "./pages/ExamLaunch";

// Admin Certification pages
import CertificationProducts from "./pages/admin/CertificationProductsUnified";
import MockExamProducts from "./pages/admin/MockExamProducts";
import MembershipBenefitBooks from "./pages/admin/MembershipBenefitBooks";
import BookProducts from "./pages/admin/BookProducts";
import GrantBookAccess from "./pages/admin/GrantBookAccess";
import PartnershipProducts from "./pages/admin/PartnershipProducts";
import MembershipProducts from "./pages/admin/MembershipProducts";
import CertificationExamsAdmin from "./pages/admin/CertificationExams";
import CertificationExamQuestionManager from "./pages/admin/CertificationExamQuestionManager";
import Vouchers from "./pages/admin/Vouchers";
import CustomersVouchers from "./pages/admin/CustomersVouchers";
import ContentManagement from "./pages/admin/ContentManagement";
import ToolkitManagement from "./pages/admin/ToolkitManagement";
import ResourceConfiguration from "./pages/admin/ResourceConfiguration";
import ECPManagement from "./pages/admin/ECPManagement";
import ECPToolkitManagement from "./pages/admin/ECPToolkitManagement";
import ECPDetails from "./pages/admin/ecp/ECPDetails";
import VoucherAllocation from "./pages/admin/ecp/VoucherAllocation";
import AdminECPTrainingBatches from "./pages/admin/ecp/TrainingBatches";
import AdminECPTrainingBatchNew from "./pages/admin/ecp/TrainingBatchNew";
import AdminECPTrainingBatchDetail from "./pages/admin/ecp/TrainingBatchDetail";
import AdminECPTrainingBatchEdit from "./pages/admin/ecp/TrainingBatchEdit";
import PDPManagement from "./pages/admin/PDPManagement";
import PDPDetails from "./pages/admin/pdp/PDPDetails";
import LicenseManagement from "./pages/admin/pdp/LicenseManagement";
import RequestReview from "./pages/admin/pdp/RequestReview";
import PDPProgramReview from "./pages/admin/PDPProgramReview";
import ProgramReview from "./pages/admin/pdp-programs/ProgramReview";
import PDPGuidelinesAdmin from "./pages/admin/PDPGuidelines";
import GuidelineCreate from "./pages/admin/pdp-guidelines/GuidelineCreate";
import GuidelineEdit from "./pages/admin/pdp-guidelines/GuidelineEdit";
import PDPAnnualReportsAdmin from "./pages/admin/PDPAnnualReports";
import AdminManagement from "./pages/admin/AdminManagement";
import BulkUserUpload from "./pages/admin/BulkUserUpload";
import TrainingBatchManagement from "./pages/admin/TrainingBatchManagement";
import ExamSchedulingAdmin from "./pages/admin/ExamSchedulingAdmin";
import ExamBookingsAdmin from "./pages/admin/ExamBookingsAdmin";
import ExamBookingDetail from "./pages/admin/ExamBookingDetail";
import ExamWindows from "./pages/admin/ExamWindows";
import ImpersonationBanner from "./components/ImpersonationBanner";
import ReportsAnalytics from "./pages/admin/ReportsAnalytics";
import FinanceTransactions from "./pages/admin/FinanceTransactions";
import Communications from "./pages/admin/Communications";
import SystemSettings from "./pages/admin/SystemSettings";
import SecurityLogs from "./pages/admin/SecurityLogs";
import TrainerManagement from "./pages/admin/TrainerManagement";
import LearningSystemProducts from "./pages/admin/LearningSystemProducts";
import CertificateDesigner from "./pages/admin/CertificateDesigner";
import ExamECOBlueprintManager from "./pages/admin/ExamECOBlueprintManager";
import VoucherTrackingAdmin from "./pages/admin/VoucherTrackingAdmin";
import CountryAnalytics from "./pages/admin/CountryAnalytics";

// Profile Completion pages
import IndividualCompleteProfile from "./pages/individual/CompleteProfile";
import PartnerCompleteProfile from "./pages/partner/CompleteProfile";

// Dual Partner Workspace
import WorkspaceSwitcher from './pages/partner/WorkspaceSwitcher';
import UpgradePartnership from './pages/partner/UpgradePartnership';

// Partnership Pending page (for ecp_pending / pdp_pending roles)
import PartnershipPending from './pages/PartnershipPending';

// ECP Partner pages
import { ECPDashboard, ECPTrainees, ECPTrainingBatches, ECPTrainingBatchNew, ECPTrainingBatchEdit, ECPTrainingBatchDetail, ECPTrainers, ECPTrainerNew, ECPTrainerDetail, ECPTrainerEdit, ECPVouchers, ECPReports, ECPLicense, ECPToolkit, ECPHelpCenter } from "./pages/ecp";

// PDP Partner pages
import { PDPDashboard, PDPPrograms, PDPProgramDetail, PDPProgramEdit, PDPSubmitProgram, PDPAnnualReport, PDPEditProfile, PDPGuidelines, PDPCompetencyMapping, PDPLicense, PDPSupportCenter, PDPToolkit } from "./pages/pdp";

const queryClient = new QueryClient();

// Placeholder component for pages not yet implemented
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
    <p className="text-gray-600">
      This page will be implemented in the next phase.
    </p>
  </div>
);

// Protected layout wrapper component with profile completion guard
const ProtectedLayoutWrapper = () => (
  <ProtectedRoute>
    <ProfileCompletionGuard>
      <PortalLayout>
        <Outlet />
      </PortalLayout>
    </ProfileCompletionGuard>
  </ProtectedRoute>
);

// Individual-only routes wrapper
const IndividualOnlyWrapper = () => (
  <ProtectedRoute>
    <ProfileCompletionGuard>
      <RoleGuard allowedRoles={['individual']}>
        <PortalLayout>
          <Outlet />
        </PortalLayout>
      </RoleGuard>
    </ProfileCompletionGuard>
  </ProtectedRoute>
);

// Exam mode wrapper - no sidebar, full-screen focus mode for taking exams
// Admins are allowed so they can run test attempts from the ECO Blueprint Manager
const ExamModeWrapper = () => (
  <ProtectedRoute>
    <ProfileCompletionGuard>
      <RoleGuard allowedRoles={['individual', 'admin', 'super_admin']}>
        <Outlet />
      </RoleGuard>
    </ProfileCompletionGuard>
  </ProtectedRoute>
);

// ECP Partner-only routes wrapper (dual_partner also has access)
const ECPOnlyWrapper = () => (
  <ProtectedRoute>
    <ProfileCompletionGuard>
      <RoleGuard allowedRoles={['ecp', 'dual_partner']}>
        <PortalLayout>
          <Outlet />
        </PortalLayout>
      </RoleGuard>
    </ProfileCompletionGuard>
  </ProtectedRoute>
);

// PDP Partner-only routes wrapper (dual_partner also has access)
const PDPOnlyWrapper = () => (
  <ProtectedRoute>
    <ProfileCompletionGuard>
      <RoleGuard allowedRoles={['pdp', 'dual_partner']}>
        <PortalLayout>
          <Outlet />
        </PortalLayout>
      </RoleGuard>
    </ProfileCompletionGuard>
  </ProtectedRoute>
);

// Dual Partner workspace wrapper
const DualPartnerWrapper = () => (
  <ProtectedRoute>
    <ProfileCompletionGuard>
      <RoleGuard allowedRoles={['dual_partner']}>
        <PortalLayout>
          <Outlet />
        </PortalLayout>
      </RoleGuard>
    </ProfileCompletionGuard>
  </ProtectedRoute>
);

// Learning System routes wrapper - no sidebar, minimal top bar
const LearningSystemWrapper = () => (
  <ProtectedRoute>
    <ProfileCompletionGuard>
      <RoleGuard allowedRoles={['individual', 'ecp']}>
        <LearningSystemLayout>
          <Outlet />
        </LearningSystemLayout>
      </RoleGuard>
    </ProfileCompletionGuard>
  </ProtectedRoute>
);

// Admin-only routes wrapper
const AdminOnlyWrapper = () => (
  <ProtectedRoute>
    <RoleGuard allowedRoles={['admin', 'super_admin']}>
      <PortalLayout>
        <Outlet />
      </PortalLayout>
    </RoleGuard>
  </ProtectedRoute>
);

// Session expiry monitoring component
const SessionExpiryMonitor = () => {
  useSessionExpiry({
    showWarningDialog: true,
  });
  return null;
};

// Health check initialization component
const HealthCheckMonitor = () => {
  const { toast } = useToast();
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    if (initialized) return;

    const initializeHealthChecks = async () => {
      try {
        const health = await HealthCheckService.initializeHealthChecks();

        if (health.status === 'degraded') {
          // Show warning toast (non-blocking)
          toast({
            title: 'Limited Functionality',
            description: 'Some features may be unavailable. You can still access Portal features.',
            variant: 'default',
          });
        } else if (health.status === 'down') {
          toast({
            title: 'Service Disruption',
            description: 'We are experiencing technical difficulties. Please try again later.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to initialize health checks:', error);
      } finally {
        setInitialized(true);
      }
    };

    initializeHealthChecks();

    // Cleanup on unmount
    return () => {
      HealthCheckService.stopPeriodicChecks();
    };
  }, [initialized, toast]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <ConfirmDialogProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SessionExpiryMonitor />
              <HealthCheckMonitor />
              <ImpersonationBanner />
              <Routes>
                {/* Public verification route - no auth required */}
                <Route path="/verify" element={<VerifyCertificate />} />
                <Route path="/verify/:credentialId" element={<VerifyCertificate />} />

                {/* Public pages - no auth required */}
                <Route path="/public/programs" element={
                  <PublicPageLayout>
                    <AccreditedPrograms />
                  </PublicPageLayout>
                } />
                <Route path="/public/programs/:slug" element={
                  <PublicPageLayout>
                    <ProgramDetail />
                  </PublicPageLayout>
                } />
                <Route path="/public/providers" element={
                  <PublicPageLayout>
                    <AuthorizedProviders />
                  </PublicPageLayout>
                } />
                <Route path="/public/verify" element={
                  <PublicPageLayout>
                    <VerifyCertificate />
                  </PublicPageLayout>
                } />
                <Route path="/public/verify/:credentialId" element={
                  <PublicPageLayout>
                    <VerifyCertificate />
                  </PublicPageLayout>
                } />

                {/* Auth routes - no layout */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/set-password" element={<SetPassword />} />

                {/* Partnership Pending - for ecp_pending / pdp_pending roles */}
                <Route path="/partnership-pending" element={
                  <ProtectedRoute>
                    <PartnershipPending />
                  </ProtectedRoute>
                } />

                {/* Profile Completion routes - protected but NO profile guard */}
                <Route path="/individual/complete-profile" element={
                  <ProtectedRoute>
                    <IndividualCompleteProfile />
                  </ProtectedRoute>
                } />
                <Route path="/partner/complete-profile" element={
                  <ProtectedRoute>
                    <PartnerCompleteProfile />
                  </ProtectedRoute>
                } />

                {/* Smart dashboard router - redirects to role-specific dashboard */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardRouter />
                  </ProtectedRoute>
                } />

                {/* Shared routes - all authenticated users */}
                <Route element={<ProtectedLayoutWrapper />}>
                  <Route path="/auth-debug" element={<AuthDebug />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                {/* EXAM MODE routes - full-screen, no sidebar for focus */}
                <Route element={<ExamModeWrapper />}>
                  <Route path="/certification/exam/:examId/attempt/:attemptId" element={<TakeCertificationExamAttempt />} />
                </Route>

                {/* INDIVIDUAL-ONLY routes */}
                <Route element={<IndividualOnlyWrapper />}>
                  <Route path="/individual/dashboard" element={<IndividualDashboard />} />
                  <Route path="/my-books" element={<MyBooks />} />
                  <Route path="/my-certifications" element={<MyCertifications />} />
                  <Route path="/my-membership" element={<MyMembership />} />
                  <Route path="/my-recognitions" element={<PlaceholderPage title="My Recognitions" />} />
                  <Route path="/pdcs" element={<PDCs />} />
                  <Route path="/authorised-providers" element={<AuthorizedProviders />} />
                  <Route path="/accredited-programs" element={<AccreditedPrograms />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/verify-certification" element={<VerifyCertification />} />
                  <Route path="/help-center" element={<HelpCenter />} />

                  {/* Certification Exam routes */}
                  <Route path="/certification-exams" element={<TakeCertificationExam />} />
                  <Route path="/schedule-exam" element={<ScheduleExam />} />
                  <Route path="/exam-launch" element={<ExamLaunch />} />
                  {/* Note: Exam attempt route moved to ExamModeWrapper for full-screen focus mode */}
                  <Route path="/exam-applications" element={<ExamApplications />} />
                  <Route path="/distribute-vouchers" element={<DistributeVouchers />} />
                  <Route path="/exam-applications/:examId" element={<CertExamDetail />} />
                  <Route path="/exam-applications/:examId/take" element={<TakeCertExam />} />
                  <Route path="/exam-applications/results/:attemptId" element={<CertExamResults />} />

                  {/* Mock Exams routes */}
                  <Route path="/mock-exams" element={<MockExamList />} />
                  <Route path="/mock-exams/:examId" element={<ExamDetail />} />
                  <Route path="/mock-exams/:examId/take" element={<TakeExam />} />
                  <Route path="/mock-exams/results/:attemptId" element={<ExamResults />} />

                  {/* Support routes */}
                  <Route path="/support/new" element={<NewTicket />} />
                  <Route path="/support/my-tickets" element={<MyTickets />} />
                  <Route path="/support/tickets/:id" element={<TicketDetail />} />
                </Route>

                {/* LEARNING SYSTEM routes - no sidebar, minimal top bar */}
                <Route element={<LearningSystemWrapper />}>
                  <Route path="/learning-system" element={<LearningSystemDashboard />} />
                  <Route path="/learning-system/training-kits" element={<MyCurriculum />} />
                  <Route path="/learning-system/training-kits/module/:moduleId" element={<ModuleViewer />} />
                  <Route path="/learning-system/training-kits/modules/:moduleId/lessons/:lessonId" element={<LessonViewer />} />
                  {/* Legacy routes for backward compatibility */}
                  <Route path="/learning-system/module/:moduleId" element={<ModuleViewer />} />
                  <Route path="/learning-system/modules/:moduleId/lessons/:lessonId" element={<LessonViewer />} />
                  {/* Question Bank routes */}
                  <Route path="/learning-system/question-bank" element={<QuestionBankDashboard />} />
                  <Route path="/learning-system/question-bank/:setId" element={<PracticeSession />} />
                  {/* Flashcard routes */}
                  <Route path="/learning-system/flashcards" element={<FlashcardsDashboard />} />
                  <Route path="/learning-system/flashcards/:deckId" element={<FlashcardStudySession />} />
                  {/* Competency Analytics route (NEW) */}
                  <Route path="/learning-system/competency-analytics" element={<CompetencyAnalyticsPage />} />
                  {/* ECP Learning System routes (same layout, no sidebar) */}
                  <Route path="/ecp/learning-system" element={<LearningSystemDashboard />} />
                  <Route path="/ecp/learning-system/training-kits" element={<MyCurriculum />} />
                  <Route path="/ecp/learning-system/training-kits/module/:moduleId" element={<ModuleViewer />} />
                  <Route path="/ecp/learning-system/training-kits/modules/:moduleId/lessons/:lessonId" element={<LessonViewer />} />
                  <Route path="/ecp/learning-system/question-bank" element={<QuestionBankDashboard />} />
                  <Route path="/ecp/learning-system/question-bank/:setId" element={<PracticeSession />} />
                  <Route path="/ecp/learning-system/flashcards" element={<FlashcardsDashboard />} />
                  <Route path="/ecp/learning-system/flashcards/:deckId" element={<FlashcardStudySession />} />
                  <Route path="/ecp/learning-system/competency-analytics" element={<CompetencyAnalyticsPage />} />
                </Route>

                {/* ECP PARTNER-ONLY routes */}
                <Route element={<ECPOnlyWrapper />}>
                  <Route path="/ecp/dashboard" element={<ECPDashboard />} />
                  <Route path="/ecp/candidates" element={<ECPTrainees />} />
                  <Route path="/ecp/trainings" element={<ECPTrainingBatches />} />
                  <Route path="/ecp/trainings/new" element={<ECPTrainingBatchNew />} />
                  <Route path="/ecp/trainings/:id" element={<ECPTrainingBatchDetail />} />
                  <Route path="/ecp/trainings/:id/edit" element={<ECPTrainingBatchEdit />} />
                  <Route path="/ecp/trainers" element={<ECPTrainers />} />
                  <Route path="/ecp/trainers/new" element={<ECPTrainerNew />} />
                  <Route path="/ecp/trainers/:id" element={<ECPTrainerDetail />} />
                  <Route path="/ecp/trainers/:id/edit" element={<ECPTrainerEdit />} />
                  <Route path="/ecp/vouchers" element={<ECPVouchers />} />
                  <Route path="/ecp/reports" element={<ECPReports />} />
                  {/* ECP Mock Exams routes */}
                  <Route path="/ecp/mock-exams" element={<MockExamList />} />
                  <Route path="/ecp/mock-exams/:examId" element={<ExamDetail />} />
                  <Route path="/ecp/mock-exams/:examId/take" element={<TakeExam />} />
                  <Route path="/ecp/mock-exams/results/:attemptId" element={<ExamResults />} />
                  <Route path="/ecp/license" element={<ECPLicense />} />
                  <Route path="/ecp/toolkit" element={<ECPToolkit />} />
                  <Route path="/ecp/help" element={<ECPHelpCenter />} />
                  <Route path="/ecp/upgrade" element={<UpgradePartnership />} />
                </Route>

                {/* PDP PARTNER-ONLY routes */}
                <Route element={<PDPOnlyWrapper />}>
                  <Route path="/pdp/dashboard" element={<PDPDashboard />} />
                  <Route path="/pdp/programs" element={<PDPPrograms />} />
                  <Route path="/pdp/programs/:id" element={<PDPProgramDetail />} />
                  <Route path="/pdp/programs/:id/edit" element={<PDPProgramEdit />} />
                  <Route path="/pdp/submit-program" element={<PDPSubmitProgram />} />
                  <Route path="/pdp/annual-report" element={<PDPAnnualReport />} />
                  <Route path="/pdp/profile" element={<PDPEditProfile />} />
                  <Route path="/pdp/guidelines" element={<PDPGuidelines />} />
                  <Route path="/pdp/competency-mapping" element={<PDPCompetencyMapping />} />
                  <Route path="/pdp/license" element={<PDPLicense />} />
                  <Route path="/pdp/toolkit" element={<PDPToolkit />} />
                  <Route path="/pdp/support" element={<PDPSupportCenter />} />
                  <Route path="/pdp/upgrade" element={<UpgradePartnership />} />
                </Route>

                {/* DUAL PARTNER workspace route */}
                <Route element={<DualPartnerWrapper />}>
                  <Route path="/workspace" element={<WorkspaceSwitcher />} />
                </Route>

                {/* ADMIN-ONLY routes */}
                <Route element={<AdminOnlyWrapper />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                  <Route path="/admin/users/bulk-upload" element={<BulkUserUpload />} />
                  <Route path="/admin/memberships" element={<MembershipManagement />} />
                  <Route path="/admin/certifications" element={<CertificationManagement />} />
                  <Route path="/admin/partners" element={<PartnerManagement />} />
                  <Route path="/admin/partners/:id" element={<PartnerDetails />} />
                  <Route path="/admin/partners/:id/edit" element={<PartnerEdit />} />
                  <Route path="/admin/upgrade-requests" element={<UpgradeRequests />} />
                  <Route path="/admin/exams" element={<ExamManagement />} />
                  <Route path="/admin/exams/new" element={<ExamForm />} />
                  <Route path="/admin/exams/:examId/edit" element={<ExamForm />} />
                  <Route path="/admin/exams/:examId/questions" element={<ExamQuestionManager />} />
                  <Route path="/admin/certification-exams" element={<CertificationExamsAdmin />} />
                  <Route path="/admin/certification-exams/:examId/questions" element={<CertificationExamQuestionManager />} />
                  <Route path="/admin/certification-products" element={<CertificationProducts />} />
                  <Route path="/admin/mock-exam-products" element={<MockExamProducts />} />
                  <Route path="/admin/membership-benefit-books" element={<MembershipBenefitBooks />} />
                  <Route path="/admin/book-products" element={<BookProducts />} />
                  <Route path="/admin/grant-book-access" element={<GrantBookAccess />} />
                  <Route path="/admin/partnership-products" element={<PartnershipProducts />} />
                  <Route path="/admin/membership-products" element={<MembershipProducts />} />
                  <Route path="/admin/vouchers" element={<Vouchers />} />
                  <Route path="/admin/customers-vouchers" element={<CustomersVouchers />} />
                  <Route path="/admin/role-mapping" element={<RoleMappingSettings />} />
                  <Route path="/admin/support" element={<SupportTickets />} />
                  <Route path="/admin/support/:id" element={<SupportTicketDetail />} />
                  <Route path="/admin/pdcs" element={<PDCValidation />} />
                  <Route path="/admin/trainers" element={<TrainerManagement />} />
                  <Route path="/admin/content" element={<ContentManagement />} />
                  <Route path="/admin/toolkit" element={<ToolkitManagement />} />
                  <Route path="/admin/curriculum" element={<CurriculumModuleManager />} />
                  <Route path="/admin/curriculum/lessons" element={<LessonManager />} />
                  <Route path="/admin/curriculum/quizzes" element={<LessonQuizManager />} />
                  <Route path="/admin/curriculum/access" element={<AccessManagement />} />
                  <Route path="/admin/learning-system-products" element={<LearningSystemProducts />} />
                  {/* Question Bank Admin */}
                  <Route path="/admin/question-bank" element={<QuestionBankManager />} />
                  <Route path="/admin/question-bank/sets/:setId" element={<QuestionSetEditor />} />
                  {/* Flashcard Admin */}
                  <Route path="/admin/flashcards" element={<FlashcardManager />} />
                  <Route path="/admin/flashcards/decks/:deckId" element={<FlashcardDeckEditor />} />
                  <Route path="/admin/quizzes" element={<QuizManager />} />
                  <Route path="/admin/quizzes/new" element={<QuizEditor />} />
                  <Route path="/admin/quizzes/:id/edit" element={<QuizEditor />} />
                  <Route path="/admin/quizzes/:id/questions" element={<QuestionEditor />} />
                  <Route path="/admin/settings/resources" element={<ResourceConfiguration />} />
                  {/* Partner Management */}
                  <Route path="/admin/ecp-management" element={<ECPManagement />} />
                  <Route path="/admin/ecp/:id" element={<ECPDetails />} />
                  <Route path="/admin/ecp/:id/vouchers" element={<VoucherAllocation />} />
                  {/* ECP Training Batches */}
                  <Route path="/admin/ecp/trainings" element={<AdminECPTrainingBatches />} />
                  <Route path="/admin/ecp/trainings/new" element={<AdminECPTrainingBatchNew />} />
                  <Route path="/admin/ecp/trainings/:id" element={<AdminECPTrainingBatchDetail />} />
                  <Route path="/admin/ecp/trainings/:id/edit" element={<AdminECPTrainingBatchEdit />} />
                  <Route path="/admin/ecp-toolkit" element={<ECPToolkitManagement />} />
                  <Route path="/admin/pdp-management" element={<PDPManagement />} />
                  <Route path="/admin/pdp/:id" element={<PDPDetails />} />
                  <Route path="/admin/pdp/:id/license" element={<LicenseManagement />} />
                  <Route path="/admin/pdp/:id/requests/:requestId" element={<RequestReview />} />
                  <Route path="/admin/pdp-programs" element={<PDPProgramReview />} />
                  <Route path="/admin/pdp-programs/:programId/review" element={<ProgramReview />} />
                  <Route path="/admin/pdp-guidelines" element={<PDPGuidelinesAdmin />} />
                  <Route path="/admin/pdp-guidelines/create" element={<GuidelineCreate />} />
                  <Route path="/admin/pdp-guidelines/:id/edit" element={<GuidelineEdit />} />
                  <Route path="/admin/pdp-reports" element={<PDPAnnualReportsAdmin />} />
                  <Route path="/admin/training-batches" element={<TrainingBatchManagement />} />
                  <Route path="/admin/exam-scheduling" element={<ExamSchedulingAdmin />} />
                  <Route path="/admin/exam-bookings" element={<ExamBookingsAdmin />} />
                  <Route path="/admin/exam-bookings/:id" element={<ExamBookingDetail />} />
                  <Route path="/admin/exam-windows" element={<ExamWindows />} />
                  <Route path="/admin/exams/eco-blueprint" element={<ExamECOBlueprintManager />} />
                  <Route path="/admin/voucher-tracking" element={<VoucherTrackingAdmin />} />
                  <Route path="/admin/admins" element={<AdminManagement />} />
                  <Route path="/admin/finance" element={<FinanceTransactions />} />
                  <Route path="/admin/reports" element={<ReportsAnalytics />} />
                  <Route path="/admin/country-analytics" element={<CountryAnalytics />} />
                  <Route path="/admin/communications" element={<Communications />} />
                  <Route path="/admin/settings" element={<SystemSettings />} />
                  <Route path="/admin/security" element={<SecurityLogs />} />
                  <Route path="/admin/certificate-designer" element={<CertificateDesigner />} />
                </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ConfirmDialogProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
