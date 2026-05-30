import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from '@/app/providers/AuthProvider';
import { AuthService } from '@/entities/auth/auth.service';
import {
  BarChart3,
  BookOpen,
  FileText,
  PenTool,
  Award,
  Star,
  Users,
  Gift,
  Shield,
  HelpCircle,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuthContext();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: t("nav.dashboard"), href: "/dashboard", icon: BarChart3 },
    {
      name: t("nav.examApplications"),
      href: "/dashboard/exam-applications",
      icon: FileText,
    },
    { name: t("nav.mockExams"), href: "/dashboard/mock-exams", icon: PenTool },
    {
      name: t("nav.myCertifications"),
      href: "/dashboard/certifications",
      icon: Award,
    },
    {
      name: t("nav.myRecognitions"),
      href: "/dashboard/recognitions",
      icon: Star,
    },
    { name: t("nav.idus"), href: "/dashboard/idus", icon: Users },
    {
      name: t("nav.awardApplications"),
      href: "/dashboard/awards",
      icon: Gift,
    },
    {
      name: t("nav.authorisedProviders"),
      href: "/dashboard/providers",
      icon: Shield,
    },
    { name: t("nav.helpCenter"), href: "/dashboard/help", icon: HelpCircle },
  ];

  const bottomNavigation = [
    {
      name: t("nav.returnToWebsite"),
      href: "https://bda-global.org",
      icon: ExternalLink,
      external: true,
    },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      closeSidebar();
      // Redirect will be handled by AuthProvider
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? "font-arabic" : ""}`}>
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={closeSidebar}>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isRTL ? "right-0" : "left-0"
        } ${
          sidebarOpen
            ? "translate-x-0"
            : isRTL
              ? "translate-x-full"
              : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo area */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-4">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">
                BDA Portal
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeSidebar}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={closeSidebar}
                  className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 shrink-0 ${isRTL ? "ml-3 mr-0" : ""} ${
                      isActive ? "text-white" : "text-gray-400"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom navigation */}
          <div className="border-t border-gray-200 p-2">
            {bottomNavigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={closeSidebar}
                className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <item.icon
                  className={`mr-3 h-5 w-5 shrink-0 text-gray-400 ${isRTL ? "ml-3 mr-0" : ""}`}
                />
                {item.name}
              </a>
            ))}
            
            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <LogOut
                className={`mr-3 h-5 w-5 shrink-0 text-gray-400 ${isRTL ? "ml-3 mr-0" : ""}`}
              />
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`lg:pl-64 ${isRTL ? "lg:pl-0 lg:pr-64" : ""}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Profile and Sign Out */}
              <div className="flex items-center gap-x-3">
                {/* Profile info */}
                <div className="flex items-center gap-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={user?.profile?.first_name || "User"} />
                    <AvatarFallback className="bg-primary text-white">
                      {user?.profile?.first_name?.substring(0, 1).toUpperCase() ||
                       user?.email?.substring(0, 1).toUpperCase() || 'BDA'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:flex lg:flex-col lg:text-sm lg:leading-4">
                    <p className="font-semibold text-gray-900">
                      {user?.profile?.first_name && user?.profile?.last_name
                        ? `${user.profile.first_name} ${user.profile.last_name}`
                        : user?.email || 'BDA Member'}
                    </p>
                    <p className="text-gray-600">
                      {user?.email || 'member@bda-global.org'}
                    </p>
                  </div>
                </div>
                
                {/* Sign Out Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="hidden sm:flex items-center gap-2 text-gray-700 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">{t("nav.signOut")}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
