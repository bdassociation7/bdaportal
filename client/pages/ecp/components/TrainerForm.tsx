/**
 * TrainerForm Component
 * Reusable form for creating and editing ECP trainers
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCheck, AlertCircle, Award, Mail, Phone, Linkedin, FileText, Send } from 'lucide-react';
import type { CreateTrainerDTO, Trainer, CertificationType } from '@/entities/ecp';

interface TrainerFormProps {
  initialData?: Trainer;
  onSubmit: (data: CreateTrainerDTO, sendInvite: boolean) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  showInviteOption?: boolean; // only shown on create, not edit
}

export function TrainerForm({ initialData, onSubmit, onCancel, isSubmitting, showInviteOption }: TrainerFormProps) {
  const [formData, setFormData] = useState<CreateTrainerDTO>({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    certifications: initialData?.certifications || [],
    trainer_certification_date: initialData?.trainer_certification_date || '',
    trainer_certification_expiry: initialData?.trainer_certification_expiry || '',
    bio: initialData?.bio || '',
    linkedin_url: initialData?.linkedin_url || '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [sendInvite, setSendInvite] = useState(true); // default: send invite

  const handleInputChange = (field: keyof CreateTrainerDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleCertification = (cert: CertificationType) => {
    const certs = formData.certifications || [];
    if (certs.includes(cert)) {
      setFormData({ ...formData, certifications: certs.filter(c => c !== cert) });
    } else {
      setFormData({ ...formData, certifications: [...certs, cert] });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }

    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.trainer_certification_date && formData.trainer_certification_expiry) {
      const certDate = new Date(formData.trainer_certification_date);
      const expiryDate = new Date(formData.trainer_certification_expiry);
      if (expiryDate <= certDate) {
        errors.trainer_certification_expiry = 'Expiry date must be after certification date';
      }
    }

    if (formData.linkedin_url && formData.linkedin_url.trim()) {
      try {
        new URL(formData.linkedin_url);
      } catch {
        errors.linkedin_url = 'Invalid URL format';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const cleanedData: CreateTrainerDTO = {
      ...formData,
      phone: formData.phone?.trim() || undefined,
      trainer_certification_date: formData.trainer_certification_date || undefined,
      trainer_certification_expiry: formData.trainer_certification_expiry || undefined,
      bio: formData.bio?.trim() || undefined,
      linkedin_url: formData.linkedin_url?.trim() || undefined,
    };

    await onSubmit(cleanedData, sendInvite);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Trainer personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={e => handleInputChange('first_name', e.target.value)}
                placeholder="John"
              />
              {validationErrors.first_name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.first_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={e => handleInputChange('last_name', e.target.value)}
                placeholder="Doe"
              />
              {validationErrors.last_name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.last_name}
                </p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  placeholder="trainer@example.com"
                  className="pl-10"
                />
              </div>
              {validationErrors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => handleInputChange('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="linkedin_url"
                value={formData.linkedin_url}
                onChange={e => handleInputChange('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="pl-10"
              />
            </div>
            {validationErrors.linkedin_url && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.linkedin_url}
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">
              <FileText className="h-4 w-4 inline mr-1" />
              Bio / Qualifications
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={e => handleInputChange('bio', e.target.value)}
              placeholder="Professional background, qualifications, experience..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications
          </CardTitle>
          <CardDescription>Trainer certification details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Certification Types */}
          <div className="space-y-2">
            <Label>Certifications Held</Label>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cp"
                  checked={formData.certifications?.includes('CP')}
                  onCheckedChange={() => toggleCertification('CP')}
                />
                <label htmlFor="cp" className="text-sm cursor-pointer">
                  CP (Certified Professional)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="scp"
                  checked={formData.certifications?.includes('SCP')}
                  onCheckedChange={() => toggleCertification('SCP')}
                />
                <label htmlFor="scp" className="text-sm cursor-pointer">
                  SCP (Senior Certified Professional)
                </label>
              </div>
            </div>
          </div>

          {/* Certification Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trainer_certification_date">Trainer Certification Date</Label>
              <Input
                id="trainer_certification_date"
                type="date"
                value={formData.trainer_certification_date}
                onChange={e => handleInputChange('trainer_certification_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainer_certification_expiry">Certification Expiry Date</Label>
              <Input
                id="trainer_certification_expiry"
                type="date"
                value={formData.trainer_certification_expiry}
                onChange={e => handleInputChange('trainer_certification_expiry', e.target.value)}
              />
              {validationErrors.trainer_certification_expiry && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.trainer_certification_expiry}
                </p>
              )}
            </div>
          </div>

          {formData.trainer_certification_expiry && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {new Date(formData.trainer_certification_expiry) < new Date() ? (
                  <span className="text-red-600">
                    This trainer's certification has expired.
                  </span>
                ) : new Date(formData.trainer_certification_expiry).getTime() - Date.now() <
                  90 * 24 * 60 * 60 * 1000 ? (
                  <span className="text-orange-600">
                    This trainer's certification will expire soon. Consider renewal.
                  </span>
                ) : (
                  <span className="text-green-600">
                    Certification is valid until{' '}
                    {new Date(formData.trainer_certification_expiry).toLocaleDateString()}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Portal Invite Option — create only */}
      {showInviteOption && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="send_invite"
                checked={sendInvite}
                onCheckedChange={(v) => setSendInvite(!!v)}
                className="mt-0.5"
              />
              <div>
                <label htmlFor="send_invite" className="text-sm font-semibold text-amber-900 cursor-pointer flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send portal invite immediately after saving
                </label>
                <p className="text-xs text-amber-700 mt-1">
                  The trainer will receive an email with a magic link to activate their account and access the Learning System with Instructor View.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Actions */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : initialData
              ? 'Update Trainer'
              : sendInvite && showInviteOption
                ? 'Add Trainer & Send Invite'
                : 'Add Trainer'
          }
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
