import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  User,
  FileText,
  Ticket,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuiz, useCheckVoucherForQuiz } from '@/entities/quiz';
import { useAuth } from '@/app/providers/AuthProvider';
import type { CertificationType, DifficultyLevel } from '@/entities/quiz/quiz.types';
import { cn } from '@/shared/utils/cn';

/**
 * ExamDetail Page
 * Shows certification exam details with profile completion check
 */

const CERTIFICATION_LABELS: Record<CertificationType, string> = {
  CP: 'BDA Certified Professional (BDA-CP)',
  SCP: 'BDA Senior Certified Professional (BDA-SCP)',
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy: 'text-green-700 bg-green-100 border-green-300',
  medium: 'text-yellow-700 bg-yellow-100 border-yellow-300',
  hard: 'text-red-700 bg-red-100 border-red-300',
};

export default function ExamDetail() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch exam data
  const { data: quiz, isLoading, error } = useQuiz(examId || '');

  // Check if user has valid voucher for this exam
  const { data: voucher, isLoading: voucherLoading } = useCheckVoucherForQuiz(
    examId || '',
    !!examId
  );

  // Check profile completion
  const isProfileComplete = !!(
    user?.profile?.first_name &&
    user?.profile?.last_name &&
    user?.email
  );

  // Check voucher requirement
  const hasValidVoucher = !!voucher;
  const canStartExam = isProfileComplete && hasValidVoucher;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading exam details...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Exam Not Found</h2>
            <p className="text-gray-600 mb-4">
              The exam you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/exam-applications')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Exams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/exam-applications')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-4 text-white flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Certification Exam Details
          </h1>
        </div>
      </div>

      {/* Profile Check Warning */}
      {!isProfileComplete && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-1">
                  Profile Incomplete
                </h3>
                <p className="text-sm text-orange-800 mb-3">
                  Your profile must be complete before you can take a certification exam.
                  Please complete your profile information.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-900 hover:bg-orange-100"
                  onClick={() => navigate('/profile')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Complete Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voucher Check */}
      {voucherLoading ? (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">Checking voucher status...</span>
            </div>
          </CardContent>
        </Card>
      ) : hasValidVoucher ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-1">
                  Valid Voucher Found
                </h3>
                <p className="text-sm text-green-800">
                  You have a valid exam voucher. You can proceed to start the certification exam.
                </p>
                {voucher && (
                  <div className="mt-2 p-2 bg-white border border-green-200 rounded inline-block">
                    <div className="text-xs text-green-600 font-semibold mb-1">Voucher Code</div>
                    <div className="text-sm font-mono font-bold text-green-900">{voucher.code}</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  Exam Voucher Required
                </h3>
                <p className="text-sm text-red-800 mb-3">
                  You need a valid exam voucher to take this certification exam. You can purchase a
                  certification book from our store or contact support for assistance.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-900 hover:bg-red-100"
                    onClick={() => window.open('/store', '_blank')}
                  >
                    <Ticket className="h-4 w-4 mr-2" />
                    Visit Store
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-900 hover:bg-red-100"
                    onClick={() => navigate('/support/new')}
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{quiz.title}</CardTitle>
              <p className="text-gray-600">{quiz.description}</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-100">
              <GraduationCap className="h-8 w-8 text-royal-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Certification Type */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Certification Type</span>
              </div>
              <p className="font-semibold text-gray-900">
                {CERTIFICATION_LABELS[quiz.certification_type]}
              </p>
            </div>

            {/* Difficulty */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Difficulty Level</span>
              </div>
              <Badge className={cn('border', DIFFICULTY_COLORS[quiz.difficulty_level])}>
                {DIFFICULTY_LABELS[quiz.difficulty_level]}
              </Badge>
            </div>

            {/* Duration */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Time Limit</span>
              </div>
              <p className="font-semibold text-gray-900">{quiz.time_limit_minutes} minutes</p>
            </div>

            {/* Passing Score */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Passing Score</span>
              </div>
              <p className="font-semibold text-gray-900">{quiz.passing_score_percentage}%</p>
            </div>

            {/* Questions */}
            {quiz.questions && quiz.questions.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">Total Questions</span>
                </div>
                <p className="font-semibold text-gray-900">{quiz.questions.length} questions</p>
              </div>
            )}

            {/* Total Points */}
            {quiz.questions && quiz.questions.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">Total Points</span>
                </div>
                <p className="font-semibold text-gray-900">
                  {quiz.questions.reduce((sum, q) => sum + q.points, 0)} points
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              This is an <strong>official certification exam</strong> that will appear on your permanent record.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              You must complete the exam within the time limit of <strong>{quiz.time_limit_minutes} minutes</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              You need to score at least <strong>{quiz.passing_score_percentage}%</strong> to pass and receive your certification.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Make sure you have a stable internet connection before starting.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/exam-applications')}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Exams
        </Button>
        <Button
          onClick={() => navigate(`/exam-applications/${quiz.id}/take`)}
          disabled={!canStartExam}
          className="flex-1"
          size="lg"
        >
          {!isProfileComplete ? (
            <>
              <AlertCircle className="h-5 w-5 mr-2" />
              Complete Profile First
            </>
          ) : !hasValidVoucher ? (
            <>
              <XCircle className="h-5 w-5 mr-2" />
              Voucher Required
            </>
          ) : (
            <>
              <GraduationCap className="h-5 w-5 mr-2" />
              Start Certification Exam
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

ExamDetail.displayName = 'ExamDetail';
