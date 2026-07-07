import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { checkProfileCompletion, getFieldLabel } from '@/services/profile-completion.service';
import { UsersService } from '@/entities/users';

/**
 * Page de completion de profil pour partenaires (ECP/PDP)
 */
export default function PartnerCompleteProfile() {
  const { user, checkAuth } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isECP = user?.profile?.role === 'ecp';
  const isPDP = user?.profile?.role === 'pdp';

  const [formData, setFormData] = useState({
    first_name: user?.profile?.first_name || '',
    last_name: user?.profile?.last_name || '',
    phone: user?.profile?.phone || '',
    country_code: user?.profile?.country_code || '',
    company_name: user?.profile?.company_name || '',
    preferred_language: user?.profile?.preferred_language || 'en',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [profileStatus, setProfileStatus] = useState(checkProfileCompletion(user?.profile || null));

  useEffect(() => {
    setProfileStatus(checkProfileCompletion(user?.profile || null));
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await UsersService.updateUser(user!.profile!.id, {
        ...formData,
        profile_completed: true,
      });

      if (result.error) {
        throw result.error;
      }

      toast({
        title: 'Profile Updated',
        description: 'Your partner profile has been completed successfully!',
      });

      // Set redirecting flag BEFORE checkAuth to prevent ProfileCompletionGuard
      // from triggering a competing navigation on mobile (race condition fix)
      setIsRedirecting(true);

      // Refresh user profile to ensure updated name is reflected in state
      await checkAuth();

      // Rediriger vers le dashboard approprié
      const dashboardPath = isECP ? '/ecp/dashboard' : isPDP ? '/pdp/dashboard' : '/dashboard';
      navigate(dashboardPath, { replace: true });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si le profil est déjà complet, rediriger (sauf si on est en train de rediriger manuellement)
  useEffect(() => {
    if (profileStatus.isComplete && !isRedirecting) {
      const dashboardPath = isECP ? '/ecp/dashboard' : isPDP ? '/pdp/dashboard' : '/dashboard';
      navigate(dashboardPath);
    }
  }, [profileStatus.isComplete, isRedirecting, navigate, isECP, isPDP]);

  const partnerType = isECP ? 'ECP (Endorsed Certification Partner)' : isPDP ? 'PDP (Professional Development Partner)' : 'Partner';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
            <Building2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Partner Profile</h1>
          <p className="text-gray-600">
            Complete your {partnerType} profile to access all partnership features
          </p>
        </div>

        {/* Progress Card */}
        <Card className="mb-6 border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Profile Completion</span>
              <span className="text-sm font-bold text-emerald-600">
                {profileStatus.completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${profileStatus.completionPercentage}%` }}
              />
            </div>
            {profileStatus.missingFields.length > 0 && (
              <div className="mt-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <strong>Missing fields:</strong>{' '}
                  {profileStatus.missingFields.map(getFieldLabel).join(', ')}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Partner Representative Information</CardTitle>
            <CardDescription>
              Fields marked with <span className="text-red-500">*</span> are required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Representative Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      required
                      placeholder="John"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      required
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      required
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country_code">
                      Country <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="country_code"
                      value={formData.country_code}
                      onChange={(e) => handleChange('country_code', e.target.value.toUpperCase())}
                      required
                      maxLength={2}
                      placeholder="US"
                      className="uppercase"
                    />
                    <p className="text-xs text-gray-500">2-letter country code (e.g., US, FR, EG)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_language">
                    Preferred Language <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.preferred_language}
                    onValueChange={(value) => handleChange('preferred_language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية (Arabic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Organization Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Organisation Details</h3>

                <div className="space-y-2">
                  <Label htmlFor="company_name">
                    Organisation/Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    required
                    placeholder="Acme Training & Consulting"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const dashboardPath = isECP ? '/ecp/dashboard' : isPDP ? '/pdp/dashboard' : '/dashboard';
                    navigate(dashboardPath);
                  }}
                  disabled={isSubmitting}
                >
                  Skip for Now
                </Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <strong>Important:</strong> A complete profile is required to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                {isECP && (
                  <>
                    <li>Register and manage certification candidates</li>
                    <li>Request and distribute exam vouchers</li>
                    <li>Submit training delivery reports</li>
                    <li>Access partnership resources and toolkit</li>
                  </>
                )}
                {isPDP && (
                  <>
                    <li>Submit new PDC programs for accreditation</li>
                    <li>Manage your accredited programs</li>
                    <li>Generate Program IDs for participants</li>
                    <li>Upload annual compliance reports</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

PartnerCompleteProfile.displayName = 'PartnerCompleteProfile';
