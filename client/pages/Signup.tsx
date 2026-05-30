import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { UnifiedSignupService, type SignupRequest, type ConflictInfo } from '@/services/unified-signup.service';
import { ExistingAccountModal } from '@/components/ui/existing-account-modal';
import { WordPressAPIService } from '@/services/wordpress-api.service';
import { Loader2, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  userType: 'individual' | 'ecp' | 'pdp';
  organization: string;
}

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  // État pour le modal de compte existant
  const [existingAccountModal, setExistingAccountModal] = useState({
    open: false,
    type: 'store' as 'store' | 'portal',
    email: '',
    loading: false,
    error: ''
  });

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    userType: 'individual',
    organization: ''
  });

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { email, password, confirmPassword, firstName, lastName } = formData;

    if (!email || !password || !firstName || !lastName) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir tous les champs obligatoires.',
        variant: 'destructive'
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Les mots de passe ne correspondent pas.',
        variant: 'destructive'
      });
      return false;
    }

    if (password.length < 8) {
      toast({
        title: 'Mot de passe trop court',
        description: 'Password must contain at least 8 characters.',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  // Déterminer automatiquement l'accessType basé sur userType
  const getAccessType = (userType: string): 'portal-only' | 'store-only' | 'both' => {
    // Logique transparente : tous les utilisateurs ont accès aux deux par défaut
    // sauf si besoin spécifique détecté
    return 'both';
  };

  // Map form userType to database role
  // ECP/PDP registrations get a 'pending' role until approved by admin
  const mapUserTypeToRole = (userType: 'individual' | 'ecp' | 'pdp'): string => {
    if (userType === 'ecp') return 'ecp_pending';
    if (userType === 'pdp') return 'pdp_pending';
    return userType; // 'individual' stays as-is
  };

  // Gérer la soumission du mot de passe dans le modal
  const handleExistingAccountPassword = async (password: string) => {
    setExistingAccountModal(prev => ({ ...prev, loading: true, error: '' }));

    try {
      if (existingAccountModal.type === 'store') {
        // Vérifier les credentials WordPress
        console.log('🔐 [Signup] Verifying Store credentials:', {
          email: existingAccountModal.email,
          passwordLength: password.length
        });
        const response = await WordPressAPIService.verifyCredentials(
          existingAccountModal.email,
          password
        );
        console.log('🔐 [Signup] Store verification response:', response);

        if (response.success) {
          // Credentials valides, procéder avec la liaison
          const request: SignupRequest = {
            email: formData.email,
            password: password, // Utiliser le mot de passe Store vérifié
            firstName: formData.firstName,
            lastName: formData.lastName,
            accessType: getAccessType(formData.userType),
            role: mapUserTypeToRole(formData.userType),
            organisation: formData.organisation || undefined
          };

          const result = await UnifiedSignupService.handleSignup(request);

          if (result.success) {
            setExistingAccountModal({ open: false, type: 'store', email: '', loading: false, error: '' });
            toast({
              title: 'Accounts linked successfully!',
              description: result.message,
              variant: 'default'
            });

            if (result.nextStep === 'login') {
              navigate('/login', {
                state: {
                  email: formData.email,
                  message: 'Your accounts have been linked. You can now sign in.'
                }
              });
            }
          } else {
            setExistingAccountModal(prev => ({
              ...prev,
              loading: false,
              error: result.message || 'Error linking accounts.'
            }));
          }
        } else {
          setExistingAccountModal(prev => ({
            ...prev,
            loading: false,
            error: 'Incorrect password. Please try again.'
          }));
        }
      }
    } catch (error) {
      setExistingAccountModal(prev => ({
        ...prev,
        loading: false,
        error: 'An error occurred. Please try again.'
      }));
    }
  };

  // Navigate to login page
  const handleNavigateToLogin = () => {
    setExistingAccountModal({ open: false, type: 'store', email: '', loading: false, error: '' });
    navigate('/login', {
      state: {
        email: existingAccountModal.email,
        message: 'Sign in with your existing credentials.'
      }
    });
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setConflicts([]);

    try {
      const request: SignupRequest = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        accessType: getAccessType(formData.userType),
        role: mapUserTypeToRole(formData.userType),
        organisation: formData.organisation || undefined
      };

      const result = await UnifiedSignupService.handleSignup(request);

      if (result.success) {
        // Success - redirect based on nextStep
        toast({
          title: 'Success!',
          description: result.message,
          variant: 'default'
        });

        if (result.nextStep === 'login') {
          navigate('/login', {
            state: {
              email: formData.email,
              message: result.message
            }
          });
        }

      } else {
        // Handle cases that require user interaction
        if (result.nextStep === 'confirm_data' && result.conflicts) {
          setConflicts(result.conflicts);
          setStep(3); // Conflict resolution step
        } else if (result.action === 'requires_store_password' ||
                   result.nextStep === 'provide_store_password' ||
                   result.message?.includes('EXISTING_STORE_ACCOUNT')) {
          // Store account exists - open modal to enter password
          setExistingAccountModal({
            open: true,
            type: 'store',
            email: formData.email,
            loading: false,
            error: ''
          });
        } else {
          // Other errors
          toast({
            title: 'Information',
            description: result.message,
            variant: result.action === 'confirmed_existing' ? 'default' : 'destructive'
          });

          if (result.nextStep === 'login') {
            navigate('/login', {
              state: {
                email: formData.email,
                message: result.message
              }
            });
          }
        }
      }

    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConflictResolution = async () => {
    const confirmed = await confirm({
      title: 'Resolve conflicts',
      description: 'Do you want to use the information you entered to update both your Portal and Store accounts?',
      confirmText: 'Yes, update both accounts',
      cancelText: 'Cancel',
      variant: 'warning'
    });

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      // Call the service again - it will execute the resolve_conflicts_and_link strategy
      const request: SignupRequest = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        accessType: getAccessType(formData.userType),
        role: mapUserTypeToRole(formData.userType),
        organisation: formData.organisation || undefined
      };

      const result = await UnifiedSignupService.handleSignup(request);

      if (result.success) {
        toast({
          title: 'Conflicts resolved!',
          description: result.message,
          variant: 'default'
        });

        navigate('/login', {
          state: {
            email: formData.email,
            message: result.message
          }
        });
      } else {
        toast({
          title: 'Resolution failed',
          description: result.message || 'Unable to resolve conflicts. Please try again.',
          variant: 'destructive'
        });

        // Keep user on conflict resolution screen if it failed
        if (result.nextStep !== 'login') {
          // Stay on current step
        }
      }

    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join the BDA Community
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Automatically access Portal and Store with a single account
            </p>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Interface simplifiée sur une seule page */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Informations personnelles */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => updateFormData('firstName', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => updateFormData('lastName', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* User type */}
                <div className="border-t pt-6">
                  <Label className="text-base font-medium">Access Type</Label>
                  <RadioGroup
                    value={formData.userType}
                    onValueChange={(value: any) => updateFormData('userType', value)}
                    className="mt-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="cursor-pointer">
                        <div>
                          <div className="font-medium">Individual Professional</div>
                          <div className="text-sm text-gray-500">Individual professional</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ecp" id="ecp" />
                      <Label htmlFor="ecp" className="cursor-pointer">
                        <div>
                          <div className="font-medium">ECP Partner</div>
                          <div className="text-sm text-gray-500">Certification partner</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pdp" id="pdp" />
                      <Label htmlFor="pdp" className="cursor-pointer">
                        <div>
                          <div className="font-medium">PDP Partner</div>
                          <div className="text-sm text-gray-500">Development partner</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Organisation for ECP/PDP */}
                {(formData.userType === 'ecp' || formData.userType === 'pdp') && (
                  <div>
                    <Label htmlFor="organisation">Organisation</Label>
                    <Input
                      id="organisation"
                      value={formData.organisation}
                      onChange={(e) => updateFormData('organization', e.target.value)}
                      placeholder="Your organisation name"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/login')}
                    className="flex-1"
                  >
                    Sign In
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSignup}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Conflict resolution */}
            {step === 3 && conflicts.length > 0 && (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Inconsistencies have been detected between your existing accounts.
                  </AlertDescription>
                </Alert>

                {conflicts.map((conflict, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-orange-50">
                    <div className="text-sm font-medium text-orange-800 mb-2">
                      Conflict detected: {conflict.field}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600 mb-1">Portal Account:</div>
                        <div className="font-medium">{conflict.portalValue}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">Store Account:</div>
                        <div className="font-medium">{conflict.storeValue}</div>
                      </div>
                      <div>
                        <div className="text-blue-600 mb-1 font-medium">Will Update To:</div>
                        <div className="font-medium text-blue-800">
                          {formData.firstName} {formData.lastName}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Alert className="bg-blue-50 border-blue-200">
                  <div className="flex gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <AlertDescription className="text-blue-800">
                      Clicking "Resolve and Continue" will update both your Portal and Store accounts
                      with the name you entered: <strong>{formData.firstName} {formData.lastName}</strong>
                    </AlertDescription>
                  </div>
                </Alert>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                    disabled={loading}
                  >
                    Back to Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConflictResolution}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolve and Continue
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal pour gérer les comptes existants */}
        <ExistingAccountModal
          open={existingAccountModal.open}
          onOpenChange={(open) => setExistingAccountModal(prev => ({ ...prev, open }))}
          email={existingAccountModal.email}
          accountType={existingAccountModal.type}
          onPasswordSubmit={handleExistingAccountPassword}
          onNavigateToLogin={handleNavigateToLogin}
          loading={existingAccountModal.loading}
          error={existingAccountModal.error}
        />
      </div>
    </div>
  );
}