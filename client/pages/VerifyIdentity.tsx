/**
 * Verify Identity Page
 *
 * Universal identity verification page for all user roles
 * Requirements: task.md Step 1 - Identity Verification
 */

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
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Camera,
  IdCard,
  Loader2,
  Info
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  IdentityVerificationService,
  DOCUMENT_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  type DocumentType,
  type IdentityVerificationSubmission,
  type UploadProgress,
} from '@/entities/identity-verification';

export default function VerifyIdentity() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const [formData, setFormData] = useState<IdentityVerificationSubmission>({
    document_type: 'national_id',
  });

  const [files, setFiles] = useState<{
    front?: File;
    back?: File;
    selfie?: File;
  }>({});

  const [previews, setPreviews] = useState<{
    front?: string;
    back?: string;
    selfie?: string;
  }>({});

  // Load verification status
  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    setIsLoading(true);
    try {
      const result = await IdentityVerificationService.getVerificationStatus();

      if (result.error) {
        throw new Error(result.error.message);
      }

      setVerificationStatus(result.data);

      // If already verified, redirect to dashboard
      if (result.data?.is_verified) {
        toast({
          title: 'Already Verified',
          description: 'Your identity has already been verified.',
        });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error loading verification status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load verification status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (type: 'front' | 'back' | 'selfie', file: File | undefined) => {
    if (!file) {
      setFiles(prev => ({ ...prev, [type]: undefined }));
      setPreviews(prev => ({ ...prev, [type]: undefined }));
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'File size must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Only JPEG, PNG, WebP, and PDF files are allowed',
        variant: 'destructive',
      });
      return;
    }

    setFiles(prev => ({ ...prev, [type]: file }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!files.front) {
      toast({
        title: 'Missing Document',
        description: 'Please upload the front of your ID document',
        variant: 'destructive',
      });
      return;
    }

    if (formData.document_type === 'national_id' && !files.back) {
      toast({
        title: 'Missing Document',
        description: 'Please upload the back of your national ID',
        variant: 'destructive',
      });
      return;
    }

    if (!files.selfie) {
      toast({
        title: 'Missing Selfie',
        description: 'Please upload a selfie for identity verification',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress([]);

    try {
      const submission: IdentityVerificationSubmission = {
        ...formData,
        document_front_file: files.front,
        document_back_file: files.back,
        selfie_file: files.selfie,
      };

      const result = await IdentityVerificationService.submitIdentityVerification(
        submission,
        (progress) => {
          setUploadProgress(prev => {
            const existing = prev.findIndex(p => p.file_name === progress.file_name);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = progress;
              return updated;
            }
            return [...prev, progress];
          });
        }
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast({
        title: 'Verification Submitted',
        description: 'Your identity verification has been submitted for review. You will be notified once it is approved.',
      });

      // Reload status
      await loadVerificationStatus();

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error submitting verification:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit verification',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show status if already submitted
  if (verificationStatus?.has_submitted && !verificationStatus?.can_submit) {
    const latestVerification = verificationStatus.latest_verification;
    const status = latestVerification?.status || 'pending';

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle>Identity Verification Status</CardTitle>
                  <CardDescription>Your verification is being processed</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Current Status</AlertTitle>
                <AlertDescription>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  {verificationStatus.action_message && (
                    <p className="mt-3 text-sm">{verificationStatus.action_message}</p>
                  )}
                </AlertDescription>
              </Alert>

              {latestVerification && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Document Type:</span>
                    <span className="font-medium">{DOCUMENT_TYPE_LABELS[latestVerification.document_type]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span className="font-medium">{new Date(latestVerification.submitted_at).toLocaleDateString()}</span>
                  </div>
                  {latestVerification.reviewed_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reviewed:</span>
                      <span className="font-medium">{new Date(latestVerification.reviewed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {latestVerification.rejection_reason && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Rejection Reason</AlertTitle>
                      <AlertDescription>{latestVerification.rejection_reason}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Identity Verification</h1>
          </div>
          <p className="text-lg text-gray-600">
            Verify your identity to access certification exams
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Why do we need this?</AlertTitle>
          <AlertDescription>
            As per certification requirements, we must verify that your legal name matches your government-issued ID.
            All documents are securely stored and only accessible to authorised administrators.
          </AlertDescription>
        </Alert>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Identity Documents</CardTitle>
            <CardDescription>
              Please provide clear, readable images of your government-issued ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Document Type */}
              <div className="space-y-2">
                <Label htmlFor="document_type">Document Type *</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, document_type: value as DocumentType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Document Number */}
              <div className="space-y-2">
                <Label htmlFor="document_number">Document Number (Optional)</Label>
                <Input
                  id="document_number"
                  value={formData.document_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, document_number: e.target.value }))}
                  placeholder="Enter your document number"
                />
              </div>

              {/* Document Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="document_expiry_date">Expiry Date (Optional)</Label>
                <Input
                  id="document_expiry_date"
                  type="date"
                  value={formData.document_expiry_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, document_expiry_date: e.target.value }))}
                />
              </div>

              {/* Document Front Upload */}
              <div className="space-y-2">
                <Label htmlFor="document_front">Front of Document *</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('document_front')?.click()}
                    className="flex items-center gap-2"
                  >
                    <IdCard className="h-4 w-4" />
                    {files.front ? 'Change File' : 'Upload Front'}
                  </Button>
                  {files.front && (
                    <span className="text-sm text-gray-600">{files.front.name}</span>
                  )}
                </div>
                <input
                  id="document_front"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileChange('front', e.target.files?.[0])}
                />
                {previews.front && (
                  <img src={previews.front} alt="Document front" className="mt-2 max-w-xs rounded border" />
                )}
              </div>

              {/* Document Back Upload (if national_id) */}
              {formData.document_type === 'national_id' && (
                <div className="space-y-2">
                  <Label htmlFor="document_back">Back of Document *</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('document_back')?.click()}
                      className="flex items-center gap-2"
                    >
                      <IdCard className="h-4 w-4" />
                      {files.back ? 'Change File' : 'Upload Back'}
                    </Button>
                    {files.back && (
                      <span className="text-sm text-gray-600">{files.back.name}</span>
                    )}
                  </div>
                  <input
                    id="document_back"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange('back', e.target.files?.[0])}
                  />
                  {previews.back && (
                    <img src={previews.back} alt="Document back" className="mt-2 max-w-xs rounded border" />
                  )}
                </div>
              )}

              {/* Selfie Upload */}
              <div className="space-y-2">
                <Label htmlFor="selfie">Selfie (Liveness Check) *</Label>
                <p className="text-sm text-gray-600">
                  Please take a clear selfie showing your face
                </p>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('selfie')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    {files.selfie ? 'Change Photo' : 'Upload Selfie'}
                  </Button>
                  {files.selfie && (
                    <span className="text-sm text-gray-600">{files.selfie.name}</span>
                  )}
                </div>
                <input
                  id="selfie"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileChange('selfie', e.target.files?.[0])}
                />
                {previews.selfie && (
                  <img src={previews.selfie} alt="Selfie" className="mt-2 max-w-xs rounded border" />
                )}
              </div>

              {/* Upload Progress */}
              {uploadProgress.length > 0 && (
                <div className="space-y-2">
                  <Label>Upload Progress</Label>
                  {uploadProgress.map((progress, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{progress.file_name}</span>
                        <span>{progress.progress}%</span>
                      </div>
                      <Progress value={progress.progress} />
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !files.front || !files.selfie || (formData.document_type === 'national_id' && !files.back)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit for Verification
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                By submitting, you agree to our Terms of Use, Privacy Policy, and Exam Code of Conduct
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
