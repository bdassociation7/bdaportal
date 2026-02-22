/**
 * Exam Complete / Congratulations Page
 *
 * Shown immediately after passing an exam
 * Display results, certificate info, and next steps
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  CheckCircle,
  XCircle,
  Award,
  Download,
  Share2,
  Home,
  Loader2,
  Trophy,
  Star,
  TrendingUp,
  ArrowRight,
  Clock,
} from 'lucide-react';
import Confetti from 'react-confetti';
import { getUserCertificates, type UserCertificate } from '@/entities/certificate';

// ============================================================================
// Component
// ============================================================================

export default function ExamComplete() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const attemptId = searchParams.get('attempt_id');
  const passed = searchParams.get('passed') === 'true';
  const score = searchParams.get('score');
  const quizTitle = searchParams.get('quiz_title');

  const [isLoading, setIsLoading] = useState(true);
  const [certificate, setCertificate] = useState<UserCertificate | null>(null);
  const [showConfetti, setShowConfetti] = useState(passed);

  // ========================================================================
  // Load Certificate (if passed)
  // ========================================================================

  useEffect(() => {
    if (passed && user?.id) {
      loadCertificate();
    } else {
      setIsLoading(false);
    }

    // Stop confetti after 5 seconds
    if (passed) {
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [passed, user]);

  const loadCertificate = async () => {
    if (!user?.id) return;

    try {
      const result = await getUserCertificates(user.id);

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Get most recent certificate
      const certificates = result.data || [];
      if (certificates.length > 0) {
        setCertificate(certificates[0]);
      }
    } catch (error) {
      console.error('Error loading certificate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleViewCertificate = () => {
    navigate('/my-certifications');
  };

  const handleDownloadCertificate = () => {
    if (certificate?.certificate_url) {
      window.open(certificate.certificate_url, '_blank');
    } else {
      toast({
        title: 'Certificate Generating',
        description: 'Your certificate is being generated. Check back in a few minutes.',
      });
    }
  };

  const handleShareResult = () => {
    const text = passed
      ? `I just passed my ${quizTitle || 'BDA certification exam'} with a score of ${score}%! 🎉`
      : `I completed the ${quizTitle || 'BDA certification exam'}.`;

    if (navigator.share) {
      navigator
        .share({
          title: 'Exam Results',
          text: text,
        })
        .catch((error) => console.log('Error sharing:', error));
    } else {
      navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Result copied to clipboard',
      });
    }
  };

  // ========================================================================
  // Render Loading
  // ========================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ========================================================================
  // Render: Passed
  // ========================================================================

  if (passed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4 relative overflow-hidden">
        {/* Confetti */}
        {showConfetti && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={500}
          />
        )}

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Success Banner */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6">
              <Trophy className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Congratulations!</h1>
            <p className="text-2xl text-gray-700">You have passed the exam!</p>
            <p className="text-base text-gray-500 mt-2">
              Your digital certificate will be available for download after 14 days.
            </p>
          </div>

          {/* Score Card */}
          <Card className="mb-6 border-2 border-green-200 bg-gradient-to-br from-white to-green-50">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-green-700 mb-4">
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-lg font-semibold uppercase tracking-wide">
                    Exam Passed
                  </span>
                </div>

                {/* Score Display */}
                <div className="mb-6">
                  <div className="text-7xl font-bold text-green-600 mb-2">{score}%</div>
                  <p className="text-xl text-gray-700">{quizTitle}</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-6 border-t">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                      <Star className="h-5 w-5" />
                      <span className="text-2xl font-bold">{score}</span>
                    </div>
                    <p className="text-sm text-gray-600">Your Score</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-2xl font-bold">70</span>
                    </div>
                    <p className="text-sm text-gray-600">Passing Score</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-purple-600 mb-1">
                      <Award className="h-5 w-5" />
                      <span className="text-2xl font-bold">1</span>
                    </div>
                    <p className="text-sm text-gray-600">Certificate Earned</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certificate Card */}
          {certificate && (() => {
            const availableDate = certificate.certificate_available_date
              ? new Date(certificate.certificate_available_date)
              : null;
            const now = new Date();
            const isDownloadAvailable = !availableDate || availableDate <= now;
            const daysLeft = availableDate
              ? Math.ceil((availableDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            const formattedAvailableDate = availableDate
              ? availableDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : '';

            return (
              <Card className="mb-6 border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-6 w-6 text-blue-600" />
                    Your Certificate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">
                      You Are Now Certified!
                    </AlertTitle>
                    <AlertDescription className="text-green-800">
                      Your official certification has been issued with credential ID:{' '}
                      <strong className="font-mono">{certificate.credential_id}</strong>
                    </AlertDescription>
                  </Alert>

                  {!isDownloadAvailable && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-900">
                        Certificate Download Available Soon
                      </AlertTitle>
                      <AlertDescription className="text-amber-800">
                        Congratulations on passing the exam! Your digital certificate will be
                        available for download on{' '}
                        <strong>{formattedAvailableDate}</strong> ({daysLeft} day{daysLeft > 1 ? 's' : ''} remaining).
                        Your certification is already active and verifiable.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Certification Type</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {certificate.certification_type === 'CP'
                          ? 'BDA Certified Professional (BDA-CP™)'
                          : 'BDA Senior Certified Professional (BDA-SCP™)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Credential ID</p>
                      <p className="text-lg font-mono font-semibold text-gray-900">
                        {certificate.credential_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleViewCertificate} className="flex-1" size="lg">
                      <Award className="mr-2 h-5 w-5" />
                      View My Certifications
                    </Button>
                    {isDownloadAvailable ? (
                      <Button
                        onClick={handleDownloadCertificate}
                        variant="outline"
                        size="lg"
                        disabled={!certificate.certificate_url}
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Download PDF
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        disabled
                      >
                        <Clock className="mr-2 h-5 w-5" />
                        Available in {daysLeft} day{daysLeft > 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Your Certificate Is Being Prepared</h4>
                  <p className="text-sm text-gray-600">
                    Your digital certificate will be available for download in 14 days.
                    You will find it in your My Certifications page.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Share Your Achievement</h4>
                  <p className="text-sm text-gray-600">
                    Your certification is already active and verifiable. Add it to LinkedIn,
                    your resume, and share it with employers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Maintain Your Certification</h4>
                  <p className="text-sm text-gray-600">
                    Your certification is valid for 3 years. Earn PDC credits to maintain your
                    status.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1">
              <Home className="mr-2 h-5 w-5" />
              Back to Dashboard
            </Button>
            <Button onClick={handleShareResult} variant="outline" className="flex-1">
              <Share2 className="mr-2 h-5 w-5" />
              Share Result
            </Button>
            <Button onClick={handleViewCertificate} className="flex-1">
              View My Certifications
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // Render: Failed
  // ========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 mb-6">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Exam Complete</h1>
          <p className="text-xl text-gray-700">Unfortunately, you did not pass this time</p>
        </div>

        {/* Score Card */}
        <Card className="mb-6 border-2 border-red-200">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-red-700 mb-4">
                <XCircle className="h-6 w-6" />
                <span className="text-lg font-semibold uppercase tracking-wide">Did Not Pass</span>
              </div>

              {/* Score Display */}
              <div className="mb-6">
                <div className="text-7xl font-bold text-red-600 mb-2">{score}%</div>
                <p className="text-xl text-gray-700">{quizTitle}</p>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-6 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{score}%</div>
                  <p className="text-sm text-gray-600">Your Score</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">70%</div>
                  <p className="text-sm text-gray-600">Required to Pass</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Encouragement */}
        <Alert className="mb-6">
          <TrendingUp className="h-4 w-4" />
          <AlertTitle>Don't Give Up!</AlertTitle>
          <AlertDescription>
            Many successful professionals don't pass on their first attempt. Review your results,
            study the areas you struggled with, and try again. You can retake the exam after a
            waiting period.
          </AlertDescription>
        </Alert>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Review Your Results</h4>
                <p className="text-sm text-gray-600">
                  Check your exam breakdown to identify weak areas and focus your study efforts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Additional Study Resources</h4>
                <p className="text-sm text-gray-600">
                  Access our study materials, practice exams, and curriculum to prepare better.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Schedule a Retake</h4>
                <p className="text-sm text-gray-600">
                  You can schedule a retake exam after 30 days. Use this time to strengthen your
                  knowledge.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1">
            <Home className="mr-2 h-5 w-5" />
            Back to Dashboard
          </Button>
          <Button onClick={() => navigate('/learning-system')} className="flex-1">
            Study Materials
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
