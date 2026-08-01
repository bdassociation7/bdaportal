/**
 * Types et constantes pour les rôles Supabase
 *
 * IMPORTANT: Ces types doivent correspondre exactement à l'ENUM user_role dans Supabase
 * NOTE: dual_partner is now merged into ecp. ECP includes PDP Standard access.
 */

// Type pour les rôles utilisateur (correspond à l'ENUM Supabase)
// dual_partner kept for backward compatibility with DB enum, but treated as ecp
export type UserRole = 'individual' | 'ecp' | 'pdp' | 'dual_partner' | 'admin' | 'super_admin';

// Informations d'affichage pour chaque rôle
export interface RoleInfo {
  id: UserRole;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  color: string; // Classe Tailwind pour la couleur du texte
  bgColor: string; // Classe Tailwind pour la couleur de fond
  permissions: readonly string[];
}

/**
 * Définitions complètes des rôles avec permissions
 */
export const ROLE_DEFINITIONS: Record<UserRole, RoleInfo> = {
  // dual_partner is kept for DB enum compatibility but treated as ecp in UI
  dual_partner: {
    id: 'dual_partner',
    label: 'ECP Partner',
    labelAr: 'شريك ECP',
    description: 'Endorsed Certification Partner (includes PDP Standard access)',
    descriptionAr: 'شريك معتمد للشهادات (يشمل وصول PDP الأساسي)',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    permissions: [
      'view_profile',
      'edit_profile',
      'manage_candidates',
      'view_reports',
      'manage_vouchers',
      'manage_trainings',
      'manage_trainers',
      'view_license',
      'access_toolkit',
      'manage_programs',
      'submit_program',
      'view_guidelines',
      'manage_annual_report',
    ] as const,
  },
  individual: {
    id: 'individual',
    label: 'Professional Individual',
    labelAr: 'محترف فردي',
    description: 'Individual professional seeking certifications and professional development',
    descriptionAr: 'محترف فردي يسعى للحصول على الشهادات والتطوير المهني',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    permissions: [
      'view_profile',
      'edit_profile',
      'view_certifications',
      'apply_exam',
      'take_quiz',
      'submit_pdc',
      'create_support_ticket',
      'view_resources',
    ] as const,
  },
  ecp: {
    id: 'ecp',
    label: 'ECP Partner',
    labelAr: 'شريك ECP',
    description: 'Endorsed Certification Partner — includes PDP Standard access (up to 5 programmes)',
    descriptionAr: 'شريك معتمد للشهادات — يشمل وصول PDP الأساسي (حتى 5 برامج)',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    permissions: [
      'view_profile',
      'edit_profile',
      'manage_candidates',
      'view_reports',
      'manage_vouchers',
      'manage_trainings',
      'manage_trainers',
      'view_license',
      'access_toolkit',
      'manage_programs',
      'submit_program',
      'view_guidelines',
      'manage_annual_report',
    ] as const,
  },
  pdp: {
    id: 'pdp',
    label: 'PDP Partner',
    labelAr: 'شريك PDP',
    description: 'Professional Development Partner - Authorized PDC provider',
    descriptionAr: 'شريك التطوير المهني - مزود PDC معتمد',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    permissions: [
      'view_profile',
      'edit_profile',
      'manage_programs',
      'view_reports',
      'submit_program',
      'view_guidelines',
      'manage_annual_report',
    ] as const,
  },
  admin: {
    id: 'admin',
    label: 'Administrator',
    labelAr: 'مسؤول',
    description: 'BDA Administrator with system management privileges',
    descriptionAr: 'مسؤول BDA مع صلاحيات إدارة النظام',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    permissions: [
      'view_profile',
      'edit_profile',
      'manage_users',
      'view_all_users',
      'manage_partners',
      'manage_exams',
      'manage_pdcs',
      'manage_content',
      'manage_finance',
      'view_reports',
      'manage_communications',
      'manage_quizzes',
      'manage_questions',
      'manage_support_tickets',
      'manage_templates',
      'view_support_stats',
    ] as const,
  },
  super_admin: {
    id: 'super_admin',
    label: 'Super Administrator',
    labelAr: 'المسؤول الأعلى',
    description: 'Full system access and control',
    descriptionAr: 'وصول كامل وتحكم في النظام',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    permissions: ['*'] as const, // Toutes les permissions
  },
} as const;

/**
 * Liste de toutes les permissions disponibles dans le système
 */
export const ALL_PERMISSIONS = [
  // Profil
  'view_profile',
  'edit_profile',

  // Certifications (Individual)
  'view_certifications',
  'apply_exam',
  'take_quiz',
  'submit_pdc',
  'view_resources',

  // Support
  'create_support_ticket',
  'manage_support_tickets',
  'manage_templates',
  'view_support_stats',

  // ECP
  'manage_candidates',
  'manage_vouchers',
  'manage_trainings',
  'manage_trainers',
  'view_license',
  'access_toolkit',

  // PDP
  'manage_programs',
  'submit_program',
  'view_guidelines',
  'manage_annual_report',

  // Admin
  'manage_users',
  'view_all_users',
  'manage_partners',
  'manage_exams',
  'manage_pdcs',
  'manage_content',
  'manage_finance',
  'view_reports',
  'manage_communications',
  'manage_settings',
  'manage_security',

  // Quiz Admin
  'manage_quizzes',
  'manage_questions',
  'view_quiz_stats',
] as const;

export type Permission = typeof ALL_PERMISSIONS[number] | '*';

/**
 * Carte des routes par rôle
 * ECP now routes to /workspace (ECP + PDP switcher) since it includes PDP Standard
 */
export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  individual: '/individual/dashboard',
  ecp: '/workspace',
  pdp: '/pdp/dashboard',
  dual_partner: '/workspace', // legacy — treated as ecp
  admin: '/admin/dashboard',
  super_admin: '/admin/dashboard',
} as const;

/**
 * Vérifier si un rôle a une permission spécifique
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const roleInfo = ROLE_DEFINITIONS[role];

  // Super admin a toutes les permissions
  if (roleInfo.permissions.includes('*')) {
    return true;
  }

  // Vérifier si la permission est dans la liste
  return roleInfo.permissions.includes(permission as any);
}

/**
 * Obtenir toutes les permissions d'un rôle
 */
export function getRolePermissions(role: UserRole): readonly Permission[] {
  const roleInfo = ROLE_DEFINITIONS[role];

  // Si super admin, retourner toutes les permissions
  if (roleInfo.permissions.includes('*' as any)) {
    return ALL_PERMISSIONS;
  }

  return roleInfo.permissions as readonly Permission[];
}

/**
 * Vérifier si un utilisateur est admin
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Vérifier si un utilisateur est super admin
 */
export function isSuperAdminRole(role: UserRole): boolean {
  return role === 'super_admin';
}

/**
 * Vérifier si un utilisateur est un partenaire
 */
export function isPartnerRole(role: UserRole): boolean {
  return role === 'ecp' || role === 'pdp' || role === 'dual_partner';
}

/**
 * Check if role is an ECP partner (ecp includes dual_partner for backward compat)
 */
export function isECPRole(role: UserRole): boolean {
  return role === 'ecp' || role === 'dual_partner';
}

/**
 * Check if role is a PDP partner
 * NOTE: ECP also has PDP Standard access, but pdp role is for dedicated PDP partners
 */
export function isPDPRole(role: UserRole): boolean {
  return role === 'pdp' || role === 'dual_partner';
}

/**
 * Check if role has both ECP and PDP access
 * Now ecp role includes PDP Standard, so ecp = true
 */
export function isDualPartnerRole(role: UserRole): boolean {
  return role === 'ecp' || role === 'dual_partner';
}
