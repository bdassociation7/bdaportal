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
import { AlertCircle, CheckCircle2, User, LogOut } from 'lucide-react';
import { checkProfileCompletion, getFieldLabel } from '@/services/profile-completion.service';
import { UsersService } from '@/entities/users';

/**
 * Page de completion de profil pour utilisateurs Individual
 */
export default function CompleteProfile() {
  const { user, checkAuth, logout } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: user?.profile?.first_name || '',
    last_name: user?.profile?.last_name || '',
    phone: user?.profile?.phone || '',
    country_code: user?.profile?.country_code || '',
    job_title: user?.profile?.job_title || '',
    company_name: user?.profile?.company_name || '',
    industry: user?.profile?.industry || '',
    preferred_language: user?.profile?.preferred_language || 'en',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
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
        description: 'Your profile has been completed successfully!',
      });

      // Refresh user profile to ensure updated name is reflected in state
      // We call checkAuth which re-fetches from DB, then navigate
      await checkAuth();

      // Give React time to propagate the updated state before navigating
      await new Promise(resolve => setTimeout(resolve, 300));

      // Rediriger vers le dashboard
      navigate('/dashboard', { replace: true });
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

  // Si le profil est déjà complet, rediriger
  useEffect(() => {
    if (profileStatus.isComplete) {
      navigate('/dashboard');
    }
  }, [profileStatus.isComplete, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 relative">
      {/* Logout Button - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-gray-600 hover:text-red-600 hover:border-red-300"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">
            Please complete your profile to access all features of the BDA Portal
          </p>
          {user?.email && (
            <p className="text-sm text-gray-500 mt-2">
              Logged in as: <strong>{user.email}</strong>
            </p>
          )}
        </div>

        {/* Progress Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Profile Completion</span>
              <span className="text-sm font-bold text-blue-600">
                {profileStatus.completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
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
            <CardTitle>Personal & Professional Information</CardTitle>
            <CardDescription>
              Fields marked with <span className="text-red-500">*</span> are required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>

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

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Professional Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="job_title">
                    Job Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => handleChange('job_title', e.target.value)}
                    required
                    placeholder="Business Analyst"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name">
                    Company/Organization <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    required
                    placeholder="Acme Corporation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">
                    Industry <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    required
                    placeholder="Information Technology"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
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
                <li>Apply for certification exams</li>
                <li>Access purchased curriculum and books</li>
                <li>Submit PDC credits</li>
                <li>Download certificates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

CompleteProfile.displayName = 'CompleteProfile';
