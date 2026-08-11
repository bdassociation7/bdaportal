import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AlertCircle, ClipboardCheck, Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/shared/config/supabase.config';
import { useAuthContext } from '@/app/providers/AuthProvider';

const BDA = {
  navy: '#0d1f4e',
  blue: '#0f91e0',
  bluePale: '#f0f6ff',
  border: '#e2eaf6',
};

/**
 * Protects instructor learning-system and mock-exam routes.
 * An instructor must have at least one passed comprehensive assessment attempt.
 */
export default function InstructorAssessmentGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isAuthLoading } = useAuthContext();

  const { data: hasPassed = false, isLoading, isError, refetch } = useQuery<boolean>({
    queryKey: ['instructor-assessment-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from('instructor_assessment_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('passed', true)
        .limit(1);
      if (error) throw error;
      return (data || []).length > 0;
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6" style={{ background: BDA.bluePale }}>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: BDA.blue }} />
          Checking assessment status…
        </div>
      </div>
    );
  }

  if (hasPassed) return <Outlet />;

  const destination = location.pathname.startsWith('/instructor/mock-exams') ? 'Mock Exams' : 'the Official Learning System';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6" style={{ background: BDA.bluePale }}>
      <div className="w-full max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm" style={{ borderColor: BDA.border }}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}>
          <LockKeyhole className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: BDA.navy }}>Instructor Assessment Required</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          You must complete and pass the comprehensive Instructor Assessment before accessing {destination}.
          The assessment confirms that you have fully understood the Trainer Learning Centre modules.
        </p>
        <div className="mt-5 rounded-xl border p-4 text-left" style={{ background: BDA.bluePale, borderColor: BDA.border }}>
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: BDA.blue }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: BDA.navy }}>Qualification requirement</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                A minimum score of <strong>80%</strong> is required. You may retake the assessment as many times as needed.
              </p>
            </div>
          </div>
        </div>
        {isError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-left text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            We could not verify your assessment status. Please try again.
          </div>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isError && <Button variant="outline" onClick={() => refetch()}>Try Again</Button>}
          <Button
            className="gap-2 rounded-xl px-5 py-3"
            style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }}
            onClick={() => navigate('/instructor/assessment')}
          >
            <ClipboardCheck className="h-4 w-4" />
            Take Instructor Assessment
          </Button>
        </div>
      </div>
    </div>
  );
}
