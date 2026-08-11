/**
 * InstructorAssessmentPage — Mandatory qualifying assessment for instructors.
 * Route: /instructor/assessment
 * A passed attempt (80%+) unlocks the Official Learning System and Mock Exams.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Award, ChevronLeft, ChevronRight, ClipboardCheck,
  Loader2, RotateCcw, ShieldCheck, XCircle,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/button';

const BDA = {
  navy: '#0d1f4e',
  blue: '#0f91e0',
  bluePale: '#f0f6ff',
  blueMid: '#dbeafe',
  border: '#e2eaf6',
};
const PASSING_SCORE = 80;

type Answer = 'A' | 'B' | 'C' | 'D';
type Phase = 'intro' | 'quiz' | 'results';

interface AssessmentQuestion {
  id: string;
  order_index: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: Answer;
}

function OptionButton({
  label, text, selected, onClick,
}: {
  label: Answer;
  text: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all hover:shadow-sm"
      style={{
        background: selected ? BDA.bluePale : '#fff',
        borderColor: selected ? BDA.blue : BDA.border,
        color: BDA.navy,
      }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
        style={{
          background: selected ? BDA.blue : BDA.bluePale,
          borderColor: selected ? BDA.blue : BDA.border,
          color: selected ? '#fff' : BDA.navy,
        }}
      >
        {label}
      </span>
      <span className="flex-1 text-sm leading-relaxed text-gray-700">{text}</span>
    </button>
  );
}

export default function InstructorAssessmentPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: questions = [], isLoading, isError, refetch } = useQuery<AssessmentQuestion[]>({
    queryKey: ['instructor-assessment-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_assessment_questions')
        .select('id, order_index, question_text, option_a, option_b, option_c, option_d, correct_answer')
        .eq('is_published', true)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const current = questions[currentIdx];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  const score = useMemo(() => {
    if (phase !== 'results') return 0;
    const correct = questions.filter(question => answers[question.id] === question.correct_answer).length;
    return Math.round((correct / totalQuestions) * 100);
  }, [answers, phase, questions, totalQuestions]);
  const passed = score >= PASSING_SCORE;

  const chooseAnswer = (answer: Answer) => {
    if (!current) return;
    setAnswers(existing => ({ ...existing, [current.id]: answer }));
  };

  const resetAttempt = () => {
    setPhase('intro');
    setCurrentIdx(0);
    setAnswers({});
    setSubmitError(null);
    setIsSubmitting(false);
  };

  const submitAssessment = async () => {
    if (!user?.id || !allAnswered || isSubmitting) return;
    const correct = questions.filter(question => answers[question.id] === question.correct_answer).length;
    const percentage = Math.round((correct / totalQuestions) * 100);
    const didPass = percentage >= PASSING_SCORE;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { error } = await supabase
        .from('instructor_assessment_attempts')
        .insert({
          user_id: user.id,
          score: correct,
          total_questions: totalQuestions,
          passed: didPass,
          answers,
        });
      if (error) throw error;
      setPhase('results');
    } catch (error: any) {
      setSubmitError(error?.message || 'We could not save your assessment result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ background: BDA.bluePale }}>
        <div className="w-full max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm" style={{ borderColor: BDA.border }}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}>
            <ClipboardCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: BDA.navy }}>Instructor Assessment</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            This is a mandatory qualifying assessment covering all five Trainer Learning Centre modules.
            You must pass it before the Official Learning System and Mock Exams are available.
          </p>

          {isLoading ? (
            <div className="mt-7 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: BDA.blue }} />
              Loading assessment…
            </div>
          ) : isError ? (
            <div className="mt-6 rounded-xl border p-4 text-left" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
              <div className="flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Assessment unavailable</p>
                  <p className="mt-1 text-xs">We could not load the assessment at the moment.</p>
                </div>
              </div>
              <Button variant="outline" className="mt-3" onClick={() => refetch()}>Try Again</Button>
            </div>
          ) : totalQuestions === 0 ? (
            <div className="mt-6 rounded-xl border p-5" style={{ background: BDA.bluePale, borderColor: BDA.border }}>
              <AlertCircle className="mx-auto mb-2 h-7 w-7" style={{ color: BDA.blue }} />
              <p className="text-sm font-semibold" style={{ color: BDA.navy }}>Assessment questions are being prepared</p>
              <p className="mt-1 text-xs text-gray-500">Please check back soon.</p>
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3" style={{ background: BDA.bluePale, borderColor: BDA.border }}>
                  <p className="text-2xl font-bold" style={{ color: BDA.navy }}>{totalQuestions}</p>
                  <p className="mt-0.5 text-xs text-gray-500">Questions</p>
                </div>
                <div className="rounded-xl border p-3" style={{ background: BDA.bluePale, borderColor: BDA.border }}>
                  <p className="text-2xl font-bold" style={{ color: BDA.navy }}>{PASSING_SCORE}%</p>
                  <p className="mt-0.5 text-xs text-gray-500">Required to pass</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl border p-4 text-left" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-800">
                  This is an official qualifying assessment. Answers and rationales are not shown during or after the attempt. You may retake it without limit if you do not pass.
                </p>
              </div>
              <Button
                className="mt-6 w-full gap-2 rounded-xl py-5 text-base"
                style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }}
                onClick={() => setPhase('quiz')}
              >
                Start Assessment <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div className="min-h-screen p-6" style={{ background: BDA.bluePale }}>
        <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm" style={{ borderColor: BDA.border }}>
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: passed ? '#f0fdf4' : '#fef2f2', border: `3px solid ${passed ? '#86efac' : '#fca5a5'}` }}>
            {passed ? <Award className="h-10 w-10 text-green-600" /> : <XCircle className="h-10 w-10 text-red-500" />}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: BDA.navy }}>
            {passed ? 'Assessment Passed' : 'Assessment Not Passed'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {passed
              ? 'You have met the qualification requirement to access the Official Learning System and Mock Exams.'
              : 'Review the Trainer Learning Centre modules and retake the assessment when you are ready.'}
          </p>
          <div className="mt-6 text-6xl font-black" style={{ color: passed ? '#16a34a' : '#dc2626' }}>{score}%</div>
          <p className="mt-1 text-xs text-gray-500">Passing score: {PASSING_SCORE}%</p>
          <p className="mt-6 text-xs leading-relaxed text-gray-400">Correct answers and rationales are not disclosed for this qualifying assessment.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {passed ? (
              <Button className="gap-2 rounded-xl px-5 py-3" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }} onClick={() => navigate('/instructor/learning-system')}>
                Access Learning System <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="gap-2 rounded-xl px-5 py-3" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }} onClick={resetAttempt}>
                <RotateCcw className="h-4 w-4" /> Retake Assessment
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const answer = current ? answers[current.id] : undefined;
  const options = current ? [
    { label: 'A' as Answer, text: current.option_a },
    { label: 'B' as Answer, text: current.option_b },
    { label: 'C' as Answer, text: current.option_c },
    { label: 'D' as Answer, text: current.option_d },
  ] : [];

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: BDA.bluePale }}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
            <span>Question {currentIdx + 1} of {totalQuestions}</span>
            <span>{answeredCount} of {totalQuestions} answered</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: BDA.blueMid }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%`, background: BDA.blue }} />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: BDA.border }}>
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: BDA.blueMid, color: BDA.navy }}>Q{currentIdx + 1}</span>
            <span className="text-xs text-gray-400">Instructor Qualifying Assessment</span>
          </div>
          <p className="mb-5 text-base font-medium leading-relaxed" style={{ color: BDA.navy }}>{current?.question_text}</p>
          <div className="space-y-2.5">
            {options.map(option => (
              <OptionButton key={option.label} {...option} selected={answer === option.label} onClick={() => chooseAnswer(option.label)} />
            ))}
          </div>
        </div>

        {submitError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm text-red-700" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {submitError}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" disabled={currentIdx === 0 || isSubmitting} onClick={() => setCurrentIdx(index => index - 1)} style={{ borderColor: BDA.border, color: BDA.navy }}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          {currentIdx < totalQuestions - 1 ? (
            <Button size="sm" disabled={!answer || isSubmitting} onClick={() => setCurrentIdx(index => index + 1)} style={{ background: BDA.navy, color: '#fff' }}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" disabled={!allAnswered || isSubmitting} onClick={submitAssessment} style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }}>
              {isSubmitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-1 h-4 w-4" />}
              Submit Assessment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
