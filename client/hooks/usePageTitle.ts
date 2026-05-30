import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const pageTitle = {
  '/': 'BDA Portal - Professional Development Platform',
  '/login': 'Login - BDA Portal',
  '/register': 'Register - BDA Portal', 
  '/register-type': 'Choose Registration Type - BDA Portal',
  '/dashboard': 'Dashboard - BDA Portal',
  '/dashboard/mock-exams': 'Mock Exams - BDA Portal',
  '/dashboard/certifications': 'My Certifications - BDA Portal',
  '/dashboard/providers': 'Authorised Providers - BDA Portal',
  '/dashboard/exam-applications': 'Exam Applications - BDA Portal',
  '/dashboard/recognitions': 'My Recognitions - BDA Portal',
  '/dashboard/idus': 'IDUs - BDA Portal',
  '/dashboard/awards': 'Award Applications - BDA Portal',
  '/dashboard/help': 'Help Center - BDA Portal',
} as const;

const getPageTitle = (pathname: string): string => {
  // Check for exact matches first
  if (pageTitle[pathname as keyof typeof pageTitle]) {
    return pageTitle[pathname as keyof typeof pageTitle];
  }
  
  // Handle dynamic routes
  if (pathname.includes('/dashboard/exam/') && pathname.includes('/instructions')) {
    return 'Exam Instructions - BDA Portal';
  }
  if (pathname.includes('/dashboard/exam/') && pathname.includes('/test')) {
    return 'Exam in Progress - BDA Portal';
  }
  if (pathname.includes('/dashboard/exam/') && pathname.includes('/results')) {
    return 'Exam Results - BDA Portal';
  }
  
  // Default fallback
  return 'BDA Portal - Professional Development Platform';
};

export const usePageTitle = () => {
  const location = useLocation();
  
  useEffect(() => {
    const title = getPageTitle(location.pathname);
    document.title = title;
  }, [location.pathname]);
};