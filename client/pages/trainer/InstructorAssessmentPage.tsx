/**
 * InstructorAssessmentPage — Comprehensive Trainer Assessment
 * Route: /instructor/assessment
 * Reads published questions from instructor_assessment_questions table.
 * Presents them as an interactive MCQ quiz with results and rationale.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/config/supabase.config';
import {
  ClipboardCheck, CheckCircle, XCircle, ChevronRight,
  ChevronLeft, RotateCcw, Award, BookOpen, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// BDA Brand Palette
const BDA = {
  navy: '#1C4A8B',
  navyDark: '#0d1f4e',
  blue: '#0f91e0',
  bluePale: '#f0f6ff',
  blueMid: '#dbeafe',
  border: '#e2eaf6',
};

interface AssessmentQuestion {
  id: string;
  order_index: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  rationale: string | null;
}

type Phase = 'intro' | 'quiz' | 'results';

// ── Option Button ─────────────────────────────────────────────────────────────
function OptionButton({
  label, text, selected, correct, revealed, onClick,
}: {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  selected: boolean;
  correct: boolean;
  revealed: boolean;
  onClick: () => void;
}) {
  let bg = '#fff';
  let border = BDA.border;
  let textColor = '#374151';

  if (revealed) {
    if (correct) { bg = '#f0fdf4'; border = '#86efac'; textColor = '#166534'; }
    else if (selected && !correct) { bg = '#fef2f2'; border = '#fca5a5'; textColor = '#991b1b'; }
  } else if (selected) {
    bg = BDA.bluePale; border = BDA.blue; textColor = BDA.navyDark;
  }

  return (
    <button
      onClick={onClick}
      disabled={revealed}
      className="w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm disabled:cursor-default"
      style={{ background: bg, borderColor: border, color: textColor }}
    >
      <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border"
        style={{
          background: revealed && correct ? '#16a34a' : revealed && selected && !correct ? '#dc2626' : selected ? BDA.blue : BDA.bluePale,
          borderColor: revealed && correct ? '#16a34a' : revealed && selected && !correct ? '#dc2626' : selected ? BDA.blue : BDA.border,
          color: (revealed && correct) || (revealed && selected && !correct) || selected ? '#fff' : BDA.navy,
        }}>
        {label}
      </span>
      <span className="flex-1 text-sm leading-relaxed">{text}</span>
      {revealed && correct && <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" />}
      {revealed && selected && !correct && <XCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function InstructorAssessmentPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const { data: questions = [], isLoading } = useQuery<AssessmentQuestion[]>({
    queryKey: ['instructor-assessment-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_assessment_questions')
        .select('id, order_index, question_text, option_a, option_b, option_c, option_d, correct_answer, rationale')
        .eq('is_published', true)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const current = questions[currentIdx];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;

  const score = useMemo(() => {
    if (phase !== 'results') return 0;
    return questions.filter(q => answers[q.id] === q.correct_answer).length;
  }, [phase, questions, answers]);

  const pct = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;

  const handleAnswer = (label: 'A' | 'B' | 'C' | 'D') => {
    if (revealed[current.id]) return;
    setAnswers(a => ({ ...a, [current.id]: label }));
  };

  const handleCheck = () => {
    if (!answers[current.id]) return;
    setRevealed(r => ({ ...r, [current.id]: true }));
  };

  const handleNext = () => {
    if (currentIdx < totalQ - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      setPhase('results');
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(i => i - 1);
  };

  const handleReset = () => {
    setPhase('intro');
    setCurrentIdx(0);
    setAnswers({});
    setRevealed({});
  };

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BDA.bluePale }}>
        <div className="max-w-lg w-full rounded-3xl border p-8 text-center"
          style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 4px 24px rgba(28,74,139,0.10)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}>
            <ClipboardCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: BDA.navyDark }}>
            Instructor Assessment
          </h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            This comprehensive assessment covers all five Trainer Learning Centre modules.
            It is designed to verify your readiness to deliver BDA programmes effectively.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: BDA.blue }} />
              Loading questions...
            </div>
          ) : totalQ === 0 ? (
            <div className="rounded-xl border p-5 text-center" style={{ background: BDA.bluePale, borderColor: BDA.border }}>
              <AlertCircle className="h-8 w-8 mx-auto mb-2" style={{ color: BDA.blue }} />
              <p className="text-sm font-semibold" style={{ color: BDA.navyDark }}>No questions available yet</p>
              <p className="text-xs text-gray-500 mt-1">The BDA team is preparing the assessment questions. Please check back soon.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl border p-3 text-center" style={{ background: BDA.bluePale, borderColor: BDA.border }}>
                  <p className="text-2xl font-bold" style={{ color: BDA.navy }}>{totalQ}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Questions</p>
                </div>
                <div className="rounded-xl border p-3 text-center" style={{ background: BDA.bluePale, borderColor: BDA.border }}>
                  <p className="text-2xl font-bold" style={{ color: BDA.navy }}>5</p>
                  <p className="text-xs text-gray-500 mt-0.5">Modules Covered</p>
                </div>
              </div>
              <Button className="w-full gap-2 text-base py-5 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }}
                onClick={() => setPhase('quiz')}>
                Start Assessment <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const passed = pct >= 70;
    return (
      <div className="min-h-screen p-6" style={{ background: BDA.bluePale }}>
        <div className="max-w-2xl mx-auto">
          {/* Score Card */}
          <div className="rounded-3xl border p-8 text-center mb-6"
            style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 4px 24px rgba(28,74,139,0.10)' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: passed ? '#f0fdf4' : '#fef2f2', border: `3px solid ${passed ? '#86efac' : '#fca5a5'}` }}>
              {passed
                ? <Award className="h-10 w-10 text-green-500" />
                : <XCircle className="h-10 w-10 text-red-400" />}
            </div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: BDA.navyDark }}>
              {passed ? 'Assessment Passed!' : 'Keep Practising'}
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              {passed
                ? 'You have demonstrated readiness to deliver BDA programmes.'
                : 'Review the modules and try again to improve your score.'}
            </p>
            <div className="text-5xl font-black mb-1" style={{ color: passed ? '#16a34a' : '#dc2626' }}>
              {pct}%
            </div>
            <p className="text-gray-400 text-sm">{score} correct out of {totalQ}</p>
            <Button className="mt-6 gap-2 px-6 py-3 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }}
              onClick={handleReset}>
              <RotateCcw className="h-4 w-4" /> Retake Assessment
            </Button>
          </div>

          {/* Per-question review */}
          <div className="space-y-4">
            {questions.map((q, i) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correct_answer;
              return (
                <div key={q.id} className="rounded-2xl border p-5"
                  style={{ background: '#fff', borderColor: BDA.border }}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: BDA.blueMid, color: BDA.navy }}>
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium leading-relaxed" style={{ color: BDA.navyDark }}>{q.question_text}</p>
                    {isCorrect
                      ? <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                      : <XCircle className="h-5 w-5 flex-shrink-0 text-red-400" />}
                  </div>
                  <div className="flex gap-2 text-xs flex-wrap">
                    <span className="px-2 py-1 rounded-full font-medium"
                      style={{ background: '#f0fdf4', color: '#166534' }}>
                      Correct: {q.correct_answer}
                    </span>
                    {!isCorrect && (
                      <span className="px-2 py-1 rounded-full font-medium"
                        style={{ background: '#fef2f2', color: '#991b1b' }}>
                        Your answer: {userAns || 'Not answered'}
                      </span>
                    )}
                  </div>
                  {q.rationale && (
                    <p className="mt-3 text-xs text-gray-500 leading-relaxed border-t pt-3" style={{ borderColor: BDA.border }}>
                      {q.rationale}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  const isRevealed = revealed[current?.id];
  const userAnswer = answers[current?.id];
  const options = [
    { label: 'A' as const, text: current?.option_a },
    { label: 'B' as const, text: current?.option_b },
    { label: 'C' as const, text: current?.option_c },
    { label: 'D' as const, text: current?.option_d },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: BDA.bluePale }}>
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Question {currentIdx + 1} of {totalQ}</span>
            <span>{answeredCount} answered</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: BDA.blueMid }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / totalQ) * 100}%`, background: BDA.blue }} />
          </div>
        </div>

        {/* Question Card */}
        <div className="rounded-2xl border p-6 mb-4"
          style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: BDA.blueMid, color: BDA.navy }}>
              Q{currentIdx + 1}
            </span>
            <span className="text-xs text-gray-400">Instructor Assessment</span>
          </div>
          <p className="text-base font-medium leading-relaxed mb-5" style={{ color: BDA.navyDark }}>
            {current?.question_text}
          </p>

          <div className="space-y-2.5">
            {options.map(opt => (
              <OptionButton
                key={opt.label}
                label={opt.label}
                text={opt.text || ''}
                selected={userAnswer === opt.label}
                correct={current?.correct_answer === opt.label}
                revealed={isRevealed}
                onClick={() => handleAnswer(opt.label)}
              />
            ))}
          </div>

          {/* Rationale */}
          {isRevealed && current?.rationale && (
            <div className="mt-4 p-4 rounded-xl border" style={{ background: BDA.bluePale, borderColor: BDA.border }}>
              <div className="flex items-center gap-2 mb-1.5">
                <BookOpen className="h-4 w-4" style={{ color: BDA.blue }} />
                <span className="text-xs font-semibold" style={{ color: BDA.navy }}>Rationale</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{current.rationale}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" disabled={currentIdx === 0}
            onClick={handlePrev}
            style={{ borderColor: BDA.border, color: BDA.navy }}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          {!isRevealed ? (
            <Button size="sm" disabled={!userAnswer}
              onClick={handleCheck}
              style={{ background: BDA.navy, color: '#fff' }}>
              Check Answer
            </Button>
          ) : (
            <Button size="sm"
              onClick={handleNext}
              style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }}>
              {currentIdx === totalQ - 1 ? 'View Results' : 'Next'} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
