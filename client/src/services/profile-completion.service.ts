/**
 * Profile Completion Service
 *
 * Service intelligent pour vérifier la complétude du profil utilisateur
 * selon leur rôle (Individual ou Partner: ECP/PDP)
 */

import type { User } from '@/entities/users/users.types';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
  requiredFields: string[];
}

/**
 * Champs requis pour un profil Individual
 */
const INDIVIDUAL_REQUIRED_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'country_code',
  'job_title',
  'company_name',
  'industry',
  'preferred_language',
] as const;

/**
 * Champs requis pour un profil Partner (ECP/PDP)
 */
const PARTNER_REQUIRED_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'country_code',
  'company_name',
  'preferred_language',
] as const;

/**
 * Labels lisibles pour les champs
 */
const FIELD_LABELS: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone Number',
  country_code: 'Country',
  job_title: 'Job Title',
  company_name: 'Company/Organisation',
  industry: 'Industry',
  preferred_language: 'Preferred Language',
  experience_years: 'Years of Experience',
  timezone: 'Timezone',
};

/**
 * Détermine les champs requis selon le rôle
 */
function getRequiredFieldsForRole(role: string): readonly string[] {
  if (role === 'ecp' || role === 'pdp' || role === 'dual_partner') {
    return PARTNER_REQUIRED_FIELDS;
  }

  if (role === 'individual') {
    return INDIVIDUAL_REQUIRED_FIELDS;
  }

  // Pour admin/super_admin, pas de vérification
  return [];
}

/**
 * Vérifie si un champ est rempli
 */
function isFieldFilled(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  return false;
}

/**
 * Vérifie la complétude du profil pour un utilisateur
 */
export function checkProfileCompletion(user: User | null): ProfileCompletionStatus {
  if (!user) {
    return {
      isComplete: false,
      missingFields: [],
      completionPercentage: 0,
      requiredFields: [],
    };
  }

  const requiredFields = getRequiredFieldsForRole(user.role);

  // Admin/Super Admin n'ont pas de profil obligatoire
  if (requiredFields.length === 0) {
    return {
      isComplete: true,
      missingFields: [],
      completionPercentage: 100,
      requiredFields: [],
    };
  }

  // Si le flag profile_completed est true, considérer le profil comme complet
  if (user.profile_completed === true) {
    return {
      isComplete: true,
      missingFields: [],
      completionPercentage: 100,
      requiredFields: Array.from(requiredFields),
    };
  }

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = (user as any)[field];
    if (!isFieldFilled(value)) {
      missingFields.push(field);
    }
  }

  const completionPercentage = Math.round(
    ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
  );

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage,
    requiredFields: Array.from(requiredFields),
  };
}

/**
 * Obtient le label lisible pour un champ
 */
export function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] || fieldName;
}

/**
 * Détermine la route de completion selon le rôle
 */
export function getProfileCompletionRoute(role: string): string {
  if (role === 'ecp' || role === 'pdp' || role === 'dual_partner') {
    return '/partner/complete-profile';
  }

  if (role === 'individual') {
    return '/individual/complete-profile';
  }

  return '/';
}

/**
 * Vérifie si l'utilisateur doit être redirigé vers la page de completion
 */
export function shouldRedirectToCompletion(
  user: User | null,
  currentPath: string
): boolean {
  if (!user) return false;

  // Admin/Super Admin ne sont jamais redirigés
  if (user.role === 'admin' || user.role === 'super_admin') {
    return false;
  }

  // Ne pas rediriger si déjà sur une page de completion
  if (currentPath.includes('/complete-profile')) {
    return false;
  }

  // Ne pas rediriger sur les pages publiques/auth
  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];
  if (publicPaths.some(path => currentPath.startsWith(path))) {
    return false;
  }

  // Vérifier la complétude
  const status = checkProfileCompletion(user);

  return !status.isComplete;
}
