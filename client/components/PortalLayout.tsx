import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { AuthService } from '@/entities/auth/auth.service';
import { navigationConfig } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X, Settings, LogOut } from 'lucide-react';
import { ROLE_DEFINITIONS, type UserRole } from '@/shared/types/roles.types';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const { isRTL, t } = useLanguage();
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get current role from authenticated user
  const currentRole = (user?.profile?.role || 'individual') as UserRole;

  // Get navigation items based on current role
  const navItems = navigationConfig[currentRole];
  const roleInfo = ROLE_DEFINITIONS[currentRole];

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleNavigation = async (item: typeof navItems[0]) => {
    if (item.action === 'logout') {
      try {
        await AuthService.signOut();
        navigate('/login');
      } catch (error) {
        console.error('Logout failed:', error);
        navigate('/login'); // Force navigation even if logout fails
      }
    } else if (item.external) {
      window.open(item.path, '_blank');
    } else if (item.path) {
      navigate(item.path);
    }
    closeSidebar();
  };

  return (
    <div className={cn("min-h-screen bg-gray-50", isRTL && "font-arabic")}>
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={closeSidebar}>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isRTL ? "right-0" : "left-0",
          sidebarOpen
            ? "translate-x-0"
            : isRTL
              ? "translate-x-full lg:translate-x-0"
              : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo area with role indicator */}
          <div className="flex h-20 shrink-0 items-center justify-between border-b border-gray-200 px-4 bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                  <span className="text-sm font-extrabold bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 bg-clip-text text-transparent">BDA</span>
                </div>
                <span className="text-lg font-bold text-white">Portal</span>
              </div>
              <Badge variant="outline" className={cn(
                "text-xs px-2 py-0.5 w-fit border-white/30 text-white bg-white/10"
              )}>
                {roleInfo.label}
              </Badge>
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
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path && location.pathname === item.path;

              return (
                <React.Fragment key={item.id}>
                  {/* Section Header */}
                  {item.section && (
                    <div className="px-2 pt-4 pb-2 first:pt-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t(item.section)}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => handleNavigation(item)}
                    className={cn(
                      "group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gradient-to-r from-sky-500 to-royal-600 text-white"
                        : "text-gray-700 hover:bg-sky-50 hover:text-royal-700",
                      item.action === 'logout' && "text-red-600 hover:bg-red-50 hover:text-red-700"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        isRTL ? "ml-3" : "mr-3",
                        isActive ? "text-white" : item.action === 'logout' ? "text-red-500" : "text-gray-400"
                      )}
                    />
                    {t(item.label)}
                    {item.external && (
                      <span className={cn("ml-auto text-xs", isActive ? "text-white" : "text-gray-400")}>
                        ↗
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          {/* Settings & Logout */}
          <div className="border-t border-gray-200">
            {/* Settings Button - Navigate directly to Settings page */}
            <button
              onClick={() => {
                navigate('/settings');
                closeSidebar();
              }}
              className={cn(
                "group flex w-full items-center px-4 py-3 text-sm font-medium transition-colors",
                location.pathname === '/settings'
                  ? "bg-royal-600 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Settings
                className={cn(
                  "h-5 w-5 shrink-0",
                  isRTL ? "ml-3" : "mr-3",
                  location.pathname === '/settings' ? "text-white" : "text-gray-400"
                )}
              />
              {t('common.settings')}
            </button>

            {/* Logout Button */}
            <button
              onClick={async () => {
                try {
                  await AuthService.signOut();
                  navigate('/login');
                } catch (error) {
                  console.error('Logout failed:', error);
                  navigate('/login');
                }
                closeSidebar();
              }}
              className="group flex w-full items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className={cn("h-5 w-5 shrink-0", isRTL ? "ml-3" : "mr-3", "text-red-500")} />
              {t('common.logOut')}
            </button>

            {/* User Info */}
            <div className="px-4 pb-4">
              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-medium truncate">
                  {user?.profile?.first_name && user?.profile?.last_name
                    ? `${user.profile.first_name} ${user.profile.last_name}`
                    : user?.email || t('common.unknown')}
                </p>
                <p>{t('common.role')}: {roleInfo.label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        "lg:pl-64",
        isRTL && "lg:pl-0 lg:pr-64"
      )}>
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
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {navItems.find(item => item.path === location.pathname)?.label
                  ? t(navItems.find(item => item.path === location.pathname)!.label)
                  : 'BDA Portal'}
              </h1>
            </div>

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Language display (read-only) */}
              <span className="text-sm text-gray-500">EN</span>
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
}

// Import Badge component
function Badge({
  children,
  variant = "default",
  className
}: {
  children: React.ReactNode;
  variant?: "default" | "outline";
  className?: string;
}) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
      variant === "outline" ? "border" : "",
      className
    )}>
      {children}
    </div>
  );
}