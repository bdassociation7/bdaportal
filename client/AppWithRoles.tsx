import "./global.css";

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { useAuthContext } from "@/app/providers/AuthProvider";
import { PortalLayout } from "@/components/PortalLayout";
import type { UserRole } from "@/shared/types/roles.types";

// Dashboard Pages
import IndividualDashboard from "./pages/individual/Dashboard";
import ECPDashboard from "./pages/ecp/Dashboard";
import PDPDashboard from "./pages/pdp/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";

// Individual Pages
import MyBooks from "./pages/individual/MyBooks";
// import ExamApplications from "./pages/individual/ExamApplications"; // TODO: Implement
import MockExams from "./pages/MockExams"; // Already exists
import MyCertifications from "./pages/individual/MyCertifications";
import MyMembership from "./pages/individual/MyMembership";
import MyRecognitions from "./pages/individual/MyRecognitions";
import PDCs from "./pages/individual/PDCs";
import AuthorizedProviders from "./pages/AuthorizedProviders"; // Already exists
import Resources from "./pages/individual/Resources";
import VerifyCertification from "./pages/individual/VerifyCertification";
import HelpCenter from "./pages/individual/HelpCenter";

// Support Pages
import NewTicket from "./pages/support/NewTicket";
import MyTickets from "./pages/support/MyTickets";
import TicketDetail from "./pages/support/TicketDetail";

// ECP Pages
// import ECPCandidates from "./pages/ecp/Candidates"; // TODO: Implement
// import ECPVouchers from "./pages/ecp/Vouchers"; // TODO: Implement
// import ECPTrainings from "./pages/ecp/Trainings"; // TODO: Implement
// import ECPTrainers from "./pages/ecp/Trainers"; // TODO: Implement
// import ECPReports from "./pages/ecp/Reports"; // TODO: Implement
// import ECPLicense from "./pages/ecp/License"; // TODO: Implement
// import ECPToolkit from "./pages/ecp/Toolkit"; // TODO: Implement
// import ECPHelp from "./pages/ecp/Help"; // TODO: Implement

// PDP Pages
// import PDPPrograms from "./pages/pdp/Programs"; // TODO: Implement
// import PDPSubmitProgram from "./pages/pdp/SubmitProgram"; // TODO: Implement
// import PDPProfile from "./pages/pdp/Profile"; // TODO: Implement
// import PDPGuidelines from "./pages/pdp/Guidelines"; // TODO: Implement
// import PDPAnnualReport from "./pages/pdp/AnnualReport"; // TODO: Implement
// import PDPSupport from "./pages/pdp/Support"; // TODO: Implement

// Admin Pages
// import AdminUsers from "./pages/admin/Users"; // TODO: Implement
// import AdminPartners from "./pages/admin/Partners"; // TODO: Implement
// import AdminExams from "./pages/admin/Exams"; // TODO: Implement
// import AdminPDCs from "./pages/admin/PDCs"; // TODO: Implement
// import AdminTrainers from "./pages/admin/Trainers"; // TODO: Implement
import ContentManagement from "./pages/admin/ContentManagement";
import ResourceConfiguration from "./pages/admin/ResourceConfiguration";
// import AdminFinance from "./pages/admin/Finance"; // TODO: Implement
// import AdminReports from "./pages/admin/Reports"; // TODO: Implement
// import AdminCommunications from "./pages/admin/Communications"; // TODO: Implement
// import AdminSettings from "./pages/admin/Settings"; // TODO: Implement
// import AdminSecurity from "./pages/admin/Security"; // TODO: Implement
import SupportTickets from "./pages/admin/SupportTickets";
import SupportTicketDetail from "./pages/admin/SupportTicketDetail";

// Auth Pages
import Login from "./pages/Login"; // Already exists

const queryClient = new QueryClient();

// Layout wrapper component
const LayoutWrapper = () => (
  <PortalLayout>
    <Outlet />
  </PortalLayout>
);

// Dynamic Dashboard Component - renders based on current role
const DynamicDashboard = () => {
  const { user } = useAuthContext();

  // Get current role from authenticated user
  const currentRole = (user?.profile?.role || 'individual') as UserRole;

  switch(currentRole) {
    case 'admin':
    case 'super_admin':
      return <AdminDashboard />;
    case 'ecp':
      return <ECPDashboard />;
    case 'pdp':
      return <PDPDashboard />;
    case 'individual':
    default:
      return <IndividualDashboard />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Login route - no layout */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes with layout */}
              <Route element={<LayoutWrapper />}>
                {/* Dynamic dashboard based on role */}
                <Route path="/dashboard" element={<DynamicDashboard />} />

                {/* Individual routes */}
                <Route path="/my-books" element={<MyBooks />} />
                {/* <Route path="/exam-applications" element={<ExamApplications />} /> */}
                <Route path="/mock-exams" element={<MockExams />} />
                <Route path="/my-certifications" element={<MyCertifications />} />
                <Route path="/my-membership" element={<MyMembership />} />
                <Route path="/my-recognitions" element={<MyRecognitions />} />
                <Route path="/pdcs" element={<PDCs />} />
                <Route path="/authorised-providers" element={<AuthorizedProviders />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/verify-certification" element={<VerifyCertification />} />
                <Route path="/help-center" element={<HelpCenter />} />

                {/* Support routes (Individual) */}
                <Route path="/support/new" element={<NewTicket />} />
                <Route path="/support/my-tickets" element={<MyTickets />} />
                <Route path="/support/tickets/:id" element={<TicketDetail />} />

                {/* ECP routes */}
                <Route path="/ecp/dashboard" element={<ECPDashboard />} />
                {/* <Route path="/ecp/candidates" element={<ECPCandidates />} /> */}
                {/* <Route path="/ecp/vouchers" element={<ECPVouchers />} /> */}
                {/* <Route path="/ecp/trainings" element={<ECPTrainings />} /> */}
                {/* <Route path="/ecp/trainers" element={<ECPTrainers />} /> */}
                {/* <Route path="/ecp/reports" element={<ECPReports />} /> */}
                {/* <Route path="/ecp/license" element={<ECPLicense />} /> */}
                {/* <Route path="/ecp/toolkit" element={<ECPToolkit />} /> */}
                {/* <Route path="/ecp/help" element={<ECPHelp />} /> */}

                {/* PDP routes */}
                <Route path="/pdp/dashboard" element={<PDPDashboard />} />
                {/* <Route path="/pdp/programs" element={<PDPPrograms />} /> */}
                {/* <Route path="/pdp/submit-program" element={<PDPSubmitProgram />} /> */}
                {/* <Route path="/pdp/profile" element={<PDPProfile />} /> */}
                {/* <Route path="/pdp/guidelines" element={<PDPGuidelines />} /> */}
                {/* <Route path="/pdp/annual-report" element={<PDPAnnualReport />} /> */}
                {/* <Route path="/pdp/support" element={<PDPSupport />} /> */}

                {/* Admin routes */}
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                {/* <Route path="/admin/users" element={<AdminUsers />} /> */}
                {/* <Route path="/admin/partners" element={<AdminPartners />} /> */}
                {/* <Route path="/admin/exams" element={<AdminExams />} /> */}
                <Route path="/admin/support" element={<SupportTickets />} />
                <Route path="/admin/support/:id" element={<SupportTicketDetail />} />
                {/* <Route path="/admin/pdcs" element={<AdminPDCs />} /> */}
                {/* <Route path="/admin/trainers" element={<AdminTrainers />} /> */}
                <Route path="/admin/content" element={<ContentManagement />} />
                <Route path="/admin/settings/resources" element={<ResourceConfiguration />} />
                {/* <Route path="/admin/finance" element={<AdminFinance />} /> */}
                {/* <Route path="/admin/reports" element={<AdminReports />} /> */}
                {/* <Route path="/admin/communications" element={<AdminCommunications />} /> */}
                {/* <Route path="/admin/settings" element={<AdminSettings />} /> */}
                {/* <Route path="/admin/security" element={<AdminSecurity />} /> */}
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);