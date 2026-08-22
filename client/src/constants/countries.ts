export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  { code: 'EG', name: 'Egypt', dialCode: '+20' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965' },
  { code: 'QA', name: 'Qatar', dialCode: '+974' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973' },
  { code: 'OM', name: 'Oman', dialCode: '+968' },
  { code: 'JO', name: 'Jordan', dialCode: '+962' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961' },
  { code: 'IQ', name: 'Iraq', dialCode: '+964' },
  { code: 'SY', name: 'Syria', dialCode: '+963' },
  { code: 'YE', name: 'Yemen', dialCode: '+967' },
  { code: 'PS', name: 'Palestine', dialCode: '+970' },
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'BE', name: 'Belgium', dialCode: '+32' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41' },
  { code: 'AT', name: 'Austria', dialCode: '+43' },
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94' },
  { code: 'NP', name: 'Nepal', dialCode: '+977' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60' },
  { code: 'SG', name: 'Singapore', dialCode: '+65' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62' },
  { code: 'TH', name: 'Thailand', dialCode: '+66' },
  { code: 'PH', name: 'Philippines', dialCode: '+63' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234' },
  { code: 'KE', name: 'Kenya', dialCode: '+254' },
  { code: 'GH', name: 'Ghana', dialCode: '+233' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255' },
];

export function countryDialCode(countryCode?: string | null): string {
  return COUNTRY_OPTIONS.find((country) => country.code === countryCode)?.dialCode || '';
}
