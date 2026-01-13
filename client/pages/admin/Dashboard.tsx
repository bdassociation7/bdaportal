import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Building2,
  AlertTriangle,
  Award,
  Ticket,
  BookOpen,
  CheckCircle,
  Clock,
  FileWarning,
  Globe,
} from "lucide-react";
import { useAdminDashboardStats } from "@/entities/admin-dashboard";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Stat Card Component for displaying a single statistic
 */
function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  subtitle,
  isLoading,
  isError,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
  subtitle?: string;
  isLoading?: boolean;
  isError?: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${iconBgColor}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900">
              {isLoading ? "..." : isError ? "-" : value}
            </p>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * System Issues Alert Card - Red styling when issues > 0
 */
function SystemIssuesCard({
  total,
  pdpPending,
  systemErrors,
  accessIssues,
  isLoading,
  isError,
}: {
  total: number;
  pdpPending: number;
  systemErrors: number;
  accessIssues: number;
  isLoading?: boolean;
  isError?: boolean;
}) {
  const { t } = useLanguage();
  const hasIssues = total > 0;

  return (
    <Card
      className={`transition-shadow ${hasIssues && !isLoading && !isError ? "border-red-200 bg-red-50" : ""}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`p-3 rounded-lg ${hasIssues && !isLoading && !isError ? "bg-red-100" : "bg-orange-100"}`}
            >
              <AlertTriangle
                className={`h-6 w-6 ${hasIssues && !isLoading && !isError ? "text-red-600" : "text-orange-600"}`}
              />
            </div>
            <div className="ml-4">
              <p
                className={`text-3xl font-bold ${hasIssues && !isLoading && !isError ? "text-red-600" : "text-gray-900"}`}
              >
                {isLoading ? "..." : isError ? "-" : total}
              </p>
              <p className="text-sm font-medium text-gray-600">
                {t("adminDashboard.systemIssues")}
              </p>
            </div>
          </div>
          {!isLoading && !isError && (
            <div className="text-right text-sm text-gray-500 space-y-1">
              <p>
                {t("adminDashboard.pdpPending")}: {pdpPending}
              </p>
              <p>
                {t("adminDashboard.systemErrors")}: {systemErrors}
              </p>
              <p>
                {t("adminDashboard.accessIssues")}: {accessIssues}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Admin Action Items Sidebar
 */
function ActionItemsSidebar({
  pdpPending,
  voucherRequests,
  accessIssues,
  isLoading,
  isError,
}: {
  pdpPending: number;
  voucherRequests: number;
  accessIssues: number;
  isLoading?: boolean;
  isError?: boolean;
}) {
  const { t } = useLanguage();

  const actions = [
    {
      title: t("adminDashboard.pdpProgramsPending"),
      count: pdpPending,
      priority: pdpPending > 0 ? "high" : "low",
    },
    {
      title: t("adminDashboard.ecpVoucherRequests"),
      count: voucherRequests,
      priority: voucherRequests > 0 ? "medium" : "low",
    },
    {
      title: t("adminDashboard.accessIssuesReported"),
      count: accessIssues,
      priority: accessIssues > 0 ? "high" : "low",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileWarning className="h-5 w-5 text-orange-500" />
          {t("adminDashboard.actionRequired")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-2xl font-bold mt-1">
                  {isLoading ? "..." : isError ? "-" : action.count}
                </p>
              </div>
              <div
                className={`h-2 w-2 rounded-full ${
                  action.priority === "high"
                    ? "bg-red-500"
                    : action.priority === "medium"
                      ? "bg-orange-500"
                      : "bg-gray-400"
                }`}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Learning System Stats Card
 */
function LearningStatsCard({
  activeUsers,
  enPercent,
  arPercent,
  totalAccess,
  isLoading,
  isError,
}: {
  activeUsers: number;
  enPercent: number;
  arPercent: number;
  totalAccess: number;
  isLoading?: boolean;
  isError?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-royal-600" />
          {t("adminDashboard.learningSystem")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-royal-600">
              {isLoading ? "..." : isError ? "-" : activeUsers}
            </p>
            <p className="text-sm text-gray-600">
              {t("adminDashboard.activeLearners7d")}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">
              {isLoading ? "..." : isError ? "-" : totalAccess}
            </p>
            <p className="text-sm text-gray-600">
              {t("adminDashboard.totalActiveAccess")}
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg flex flex-col items-center">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold text-green-600">
                {isLoading ? "..." : isError ? "-" : `${enPercent}%`}
              </p>
            </div>
            <p className="text-sm text-gray-600">English</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg flex flex-col items-center">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-600" />
              <p className="text-2xl font-bold text-amber-600">
                {isLoading ? "..." : isError ? "-" : `${arPercent}%`}
              </p>
            </div>
            <p className="text-sm text-gray-600">العربية</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const {
    partners,
    systemIssues,
    examCerts,
    vouchers,
    learning,
    actionItems,
  } = useAdminDashboardStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">{t("adminDashboard.title")}</h1>
        <p className="mt-2 opacity-90">{t("adminDashboard.subtitle")}</p>
      </div>

      {/* Row 1: Partner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title={t("adminDashboard.activeECPPartners")}
          value={partners.data?.activeECP ?? 0}
          icon={Building2}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          subtitle={t("adminDashboard.examCenters")}
          isLoading={partners.isLoading}
          isError={partners.isError}
        />
        <StatCard
          title={t("adminDashboard.activePDPPartners")}
          value={partners.data?.activePDP ?? 0}
          icon={Users}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          subtitle={t("adminDashboard.developmentProviders")}
          isLoading={partners.isLoading}
          isError={partners.isError}
        />
        <StatCard
          title={t("adminDashboard.totalActivePartners")}
          value={partners.data?.totalActive ?? 0}
          icon={Building2}
          iconColor="text-royal-600"
          iconBgColor="bg-purple-100"
          subtitle={t("adminDashboard.ecpAndPdp")}
          isLoading={partners.isLoading}
          isError={partners.isError}
        />
      </div>

      {/* Row 2: System Issues Alert */}
      <SystemIssuesCard
        total={systemIssues.data?.total ?? 0}
        pdpPending={systemIssues.data?.pdpProgramsPending ?? 0}
        systemErrors={systemIssues.data?.systemErrors24h ?? 0}
        accessIssues={systemIssues.data?.accessIssuesOpen ?? 0}
        isLoading={systemIssues.isLoading}
        isError={systemIssues.isError}
      />

      {/* Row 3: Exams & Certificates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t("adminDashboard.examsCompleted7d")}
          value={examCerts.data?.examsCompletedLast7Days ?? 0}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          subtitle={t("adminDashboard.last7Days")}
          isLoading={examCerts.isLoading}
          isError={examCerts.isError}
        />
        <StatCard
          title={t("adminDashboard.certificatesIssued7d")}
          value={examCerts.data?.certificatesIssuedLast7Days ?? 0}
          icon={Award}
          iconColor="text-royal-600"
          iconBgColor="bg-purple-100"
          subtitle={t("adminDashboard.last7Days")}
          isLoading={examCerts.isLoading}
          isError={examCerts.isError}
        />
        <StatCard
          title={t("adminDashboard.certificatesPending")}
          value={examCerts.data?.certificatesPending ?? 0}
          icon={Clock}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          subtitle={t("adminDashboard.awaitingGeneration")}
          isLoading={examCerts.isLoading}
          isError={examCerts.isError}
        />
      </div>

      {/* Row 4: Voucher Activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title={t("adminDashboard.vouchersIssuedToday")}
          value={vouchers.data?.vouchersIssuedToday ?? 0}
          icon={Ticket}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          subtitle={t("adminDashboard.examAndEcpVouchers")}
          isLoading={vouchers.isLoading}
          isError={vouchers.isError}
        />
        <StatCard
          title={t("adminDashboard.voucherRequestsPending")}
          value={vouchers.data?.voucherRequestsPending ?? 0}
          icon={Clock}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          subtitle={t("adminDashboard.awaitingApproval")}
          isLoading={vouchers.isLoading}
          isError={vouchers.isError}
        />
      </div>

      {/* Row 5: Learning System + Action Items Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LearningStatsCard
          activeUsers={learning.data?.activeLearnersLast7Days ?? 0}
          enPercent={learning.data?.enUsagePercent ?? 0}
          arPercent={learning.data?.arUsagePercent ?? 0}
          totalAccess={learning.data?.totalActiveAccess ?? 0}
          isLoading={learning.isLoading}
          isError={learning.isError}
        />
        <ActionItemsSidebar
          pdpPending={actionItems.data?.pdpProgramsPending ?? 0}
          voucherRequests={actionItems.data?.ecpVoucherRequestsPending ?? 0}
          accessIssues={actionItems.data?.accessIssuesReported ?? 0}
          isLoading={actionItems.isLoading}
          isError={actionItems.isError}
        />
      </div>
    </div>
  );
}
