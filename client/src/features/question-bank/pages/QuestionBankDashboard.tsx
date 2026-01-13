/**
 * Question Bank Dashboard
 * Shows all question sets organized by competency with user progress
 * Requires language-based access (EN or AR)
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useQuestionSetsWithProgress,
  useQuestionBankStats,
} from '@/entities/question-bank';
import {
  useQuestionBankAccess,
  useUserAccesses,
  useLanguageAccess,
  type Language,
} from '@/entities/curriculum';
import {
  ArrowLeft,
  HelpCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Star,
  ChevronRight,
  Brain,
  Target,
  Lock,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { QuestionSetWithProgress } from '@/entities/question-bank';

interface QuestionSetCardProps {
  questionSet: QuestionSetWithProgress;
  onClick: () => void;
}

function QuestionSetCard({ questionSet, onClick }: QuestionSetCardProps) {
  const progress = questionSet.progress;
  const progressPercentage = progress
    ? Math.round(
        (progress.questions_correct / (progress.questions_attempted || 1)) * 100
      )
    : 0;

  const isCompleted = progress?.completed_at !== null;
  const hasAttempted = (progress?.attempts_count || 0) > 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-green-50 to-green-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 line-clamp-2">
              {questionSet.title}
            </h3>
            {questionSet.title_ar && (
              <p className="text-sm text-gray-500 mt-1" dir="rtl">
                {questionSet.title_ar}
              </p>
            )}
            {/* Hierarchy breadcrumb */}
            {questionSet.competency && questionSet.sub_unit && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 flex-wrap">
                <span className="font-medium">{questionSet.competency.competency_name}</span>
                <ChevronRight className="w-3 h-3" />
                <span>Sub-lesson {questionSet.sub_unit.order_index}</span>
              </div>
            )}
          </div>
          {isCompleted && (
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
              <CheckCircle className="w-3 h-3" />
              Passed
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">
              {questionSet.question_count}
            </p>
            <p className="text-xs text-gray-500">Questions</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">
              {progress?.attempts_count || 0}
            </p>
            <p className="text-xs text-gray-500">Attempts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-purple-600">
              {progress?.best_score_percentage || 0}%
            </p>
            <p className="text-xs text-gray-500">Best Score</p>
          </div>
        </div>

        {/* Progress bar */}
        {hasAttempted && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Last Score</span>
              <span>{progress?.last_score_percentage || 0}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  (progress?.last_score_percentage || 0) >= questionSet.passing_score
                    ? 'bg-green-500'
                    : 'bg-yellow-500'
                }`}
                style={{ width: `${progress?.last_score_percentage || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Passing score: {questionSet.passing_score}%
            </p>
          </div>
        )}

        {/* Time limit & difficulty indicators */}
        <div className="flex items-center justify-between text-sm">
          {questionSet.time_limit_minutes && (
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{questionSet.time_limit_minutes} min</span>
            </div>
          )}
          {questionSet.is_final_test && (
            <div className="flex items-center gap-1 text-orange-600 font-medium">
              <Target className="w-4 h-4" />
              <span>Final Test</span>
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-medium text-green-600">
          {hasAttempted ? 'Practice Again' : 'Start Practice'}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}

export function QuestionBankDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Get language from URL params (passed from main Learning System dashboard)
  // This ensures isolation - once user enters EN or AR system, they stay in that language
  const langFromUrl = searchParams.get('lang') as Language | null;
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(langFromUrl || 'EN');

  // Sync with URL param changes
  useEffect(() => {
    if (langFromUrl && langFromUrl !== selectedLanguage) {
      setSelectedLanguage(langFromUrl);
    }
  }, [langFromUrl]);

  // Detect base path for navigation (ECP vs Individual learning system)
  const basePath = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/ecp/learning-system')) {
      return '/ecp/learning-system';
    }
    return '/learning-system';
  }, [location.pathname]);

  // Get all user accesses to determine available languages
  const { data: accessSummary, isLoading: accessSummaryLoading } = useUserAccesses(
    user?.id
  );

  // Check Question Bank access for selected language
  const {
    data: hasQuestionBankAccess,
    isLoading: accessLoading,
  } = useQuestionBankAccess(user?.id, selectedLanguage);

  // Get language access to determine certification type
  const {
    data: languageAccess,
    isLoading: languageAccessLoading,
  } = useLanguageAccess(user?.id, selectedLanguage);

  // Determine certification type from language access (or default to CP)
  const certificationType = languageAccess?.certification_type || 'CP';

  // Get question sets with progress (filtered by selected language)
  const {
    data: questionSets,
    isLoading: isLoadingSets,
  } = useQuestionSetsWithProgress(user?.id, certificationType, selectedLanguage);

  // Get user stats
  const { data: stats } = useQuestionBankStats(user?.id, certificationType);

  // Group question sets hierarchically: Section → Competency → Sub-lesson → Sets
  // Also includes standalone sets that don't have full hierarchy linkage
  const groupedSets = useMemo(() => {
    if (!questionSets) return { introduction: [], knowledge: {}, behavioral: {}, standalone: [] };

    const introSets: QuestionSetWithProgress[] = [];
    const knowledge: Record<string, Record<string, QuestionSetWithProgress[]>> = {};
    const behavioral: Record<string, Record<string, QuestionSetWithProgress[]>> = {};
    const standalone: QuestionSetWithProgress[] = [];

    questionSets.forEach((set) => {
      // Introduction sets (no hierarchy required)
      if (set.section_type === 'introduction') {
        introSets.push(set);
        return;
      }

      // Sets with competency and sub-lesson hierarchy
      if (set.competency && set.sub_unit) {
        const competencyId = set.competency.id;
        const subUnitId = set.sub_unit.id;
        const sectionType = set.section_type;

        if (sectionType === 'knowledge') {
          if (!knowledge[competencyId]) knowledge[competencyId] = {};
          if (!knowledge[competencyId][subUnitId]) knowledge[competencyId][subUnitId] = [];
          knowledge[competencyId][subUnitId].push(set);
        } else if (sectionType === 'behavioral') {
          if (!behavioral[competencyId]) behavioral[competencyId] = {};
          if (!behavioral[competencyId][subUnitId]) behavioral[competencyId][subUnitId] = [];
          behavioral[competencyId][subUnitId].push(set);
        }
      } else {
        // Sets without full hierarchy linkage go to standalone section
        standalone.push(set);
      }
    });

    return { introduction: introSets, knowledge, behavioral, standalone };
  }, [questionSets]);

  // Loading states
  if (accessSummaryLoading || accessLoading || languageAccessLoading || isLoadingSets) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question bank...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!hasQuestionBankAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Question Bank Access Required
            </h2>
            <p className="text-gray-600 mb-6">
              You need to purchase the Learning System ({selectedLanguage}) package that
              includes Question Bank access to view this content.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate(basePath)}
                className="w-full"
              >
                Back to Learning System
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = 'https://bda-global.org/shop'}
                className="w-full"
              >
                Visit Shop
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(basePath)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Learning System
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
              <p className="text-gray-600">
                Practice with MCQs and track your performance
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <HelpCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  Questions Attempted
                </span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {stats.questionsAttempted}
              </p>
              <p className="text-xs text-gray-500">
                of {stats.totalQuestions} total
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  Correct Answers
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {stats.questionsCorrect}
              </p>
              <p className="text-xs text-gray-500">
                {stats.questionsAttempted > 0
                  ? Math.round(
                      (stats.questionsCorrect / stats.questionsAttempted) * 100
                    )
                  : 0}
                % accuracy
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">
                  Average Score
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(stats.averageScore)}%
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">
                  Sets Completed
                </span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.setsCompleted}
              </p>
              <p className="text-xs text-gray-500">
                of {stats.totalQuestionSets} sets
              </p>
            </div>
          </div>
        )}

        {/* Introduction Section - No hierarchy */}
        {groupedSets.introduction.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">📖</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Introduction</h2>
                <p className="text-sm text-gray-600">
                  Foundation questions to get started
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSets.introduction.map((set) => (
                <QuestionSetCard
                  key={set.id}
                  questionSet={set}
                  onClick={() => navigate(`${basePath}/question-bank/${set.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Behavioral Competencies - HIERARCHICAL (Section → Competency → Sub-lesson → Sets) */}
        {Object.keys(groupedSets.behavioral).length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">💼</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Behavioral Competencies
                </h2>
                <p className="text-sm text-gray-600">
                  {Object.keys(groupedSets.behavioral).length} Core Competencies with Sub-lessons
                </p>
              </div>
            </div>

            <Accordion type="multiple" className="space-y-3">
              {Object.entries(groupedSets.behavioral).map(([competencyId, subUnits]) => {
                const firstSet = Object.values(subUnits)[0]?.[0];
                const competency = firstSet?.competency;
                if (!competency) return null;

                const totalSets = Object.values(subUnits).reduce(
                  (sum, sets) => sum + sets.length,
                  0
                );

                return (
                  <AccordionItem
                    key={competencyId}
                    value={competencyId}
                    className="border rounded-lg bg-white shadow-sm"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-purple-600" />
                          <div className="text-left">
                            <h3 className="font-semibold text-gray-900">
                              {competency.competency_name}
                            </h3>
                            {competency.competency_name_ar && (
                              <p className="text-sm text-gray-500" dir="rtl">
                                {competency.competency_name_ar}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {Object.keys(subUnits).length} Sub-lessons
                          </Badge>
                          <Badge variant="outline" className="bg-gray-50">
                            {totalSets} Sets
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2 pb-4">
                      {/* Sub-lessons nested accordion */}
                      <Accordion type="multiple" className="space-y-2">
                        {Object.entries(subUnits)
                          .sort(([, a], [, b]) => {
                            const orderA = a[0]?.sub_unit?.order_index || 0;
                            const orderB = b[0]?.sub_unit?.order_index || 0;
                            return orderA - orderB;
                          })
                          .map(([subUnitId, sets]) => {
                            const subUnit = sets[0]?.sub_unit;
                            if (!subUnit) return null;

                            return (
                              <AccordionItem
                                key={subUnitId}
                                value={subUnitId}
                                className="border rounded-md bg-gray-50"
                              >
                                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                  <div className="flex items-center justify-between w-full pr-4">
                                    <div className="text-left">
                                      <p className="font-medium text-gray-800 text-sm">
                                        Sub-lesson {subUnit.order_index}: {subUnit.title}
                                      </p>
                                      {subUnit.title_ar && (
                                        <p className="text-xs text-gray-500" dir="rtl">
                                          {subUnit.title_ar}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {sets.length} {sets.length === 1 ? 'Set' : 'Sets'}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                                    {sets.map((set) => (
                                      <QuestionSetCard
                                        key={set.id}
                                        questionSet={set}
                                        onClick={() => navigate(`${basePath}/question-bank/${set.id}`)}
                                      />
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}

        {/* Knowledge-Based Competencies - HIERARCHICAL (Section → Competency → Sub-lesson → Sets) */}
        {Object.keys(groupedSets.knowledge).length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Knowledge-Based Competencies
                </h2>
                <p className="text-sm text-gray-600">
                  {Object.keys(groupedSets.knowledge).length} Core Competencies with Sub-lessons
                </p>
              </div>
            </div>

            <Accordion type="multiple" className="space-y-3">
              {Object.entries(groupedSets.knowledge).map(([competencyId, subUnits]) => {
                const firstSet = Object.values(subUnits)[0]?.[0];
                const competency = firstSet?.competency;
                if (!competency) return null;

                const totalSets = Object.values(subUnits).reduce(
                  (sum, sets) => sum + sets.length,
                  0
                );

                return (
                  <AccordionItem
                    key={competencyId}
                    value={competencyId}
                    className="border rounded-lg bg-white shadow-sm"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Brain className="w-5 h-5 text-blue-600" />
                          <div className="text-left">
                            <h3 className="font-semibold text-gray-900">
                              {competency.competency_name}
                            </h3>
                            {competency.competency_name_ar && (
                              <p className="text-sm text-gray-500" dir="rtl">
                                {competency.competency_name_ar}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {Object.keys(subUnits).length} Sub-lessons
                          </Badge>
                          <Badge variant="outline" className="bg-gray-50">
                            {totalSets} Sets
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2 pb-4">
                      {/* Sub-lessons nested accordion */}
                      <Accordion type="multiple" className="space-y-2">
                        {Object.entries(subUnits)
                          .sort(([, a], [, b]) => {
                            const orderA = a[0]?.sub_unit?.order_index || 0;
                            const orderB = b[0]?.sub_unit?.order_index || 0;
                            return orderA - orderB;
                          })
                          .map(([subUnitId, sets]) => {
                            const subUnit = sets[0]?.sub_unit;
                            if (!subUnit) return null;

                            return (
                              <AccordionItem
                                key={subUnitId}
                                value={subUnitId}
                                className="border rounded-md bg-gray-50"
                              >
                                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                  <div className="flex items-center justify-between w-full pr-4">
                                    <div className="text-left">
                                      <p className="font-medium text-gray-800 text-sm">
                                        Sub-lesson {subUnit.order_index}: {subUnit.title}
                                      </p>
                                      {subUnit.title_ar && (
                                        <p className="text-xs text-gray-500" dir="rtl">
                                          {subUnit.title_ar}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {sets.length} {sets.length === 1 ? 'Set' : 'Sets'}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                                    {sets.map((set) => (
                                      <QuestionSetCard
                                        key={set.id}
                                        questionSet={set}
                                        onClick={() => navigate(`${basePath}/question-bank/${set.id}`)}
                                      />
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}

        {/* Standalone Question Sets - Not linked to hierarchy */}
        {groupedSets.standalone.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Practice Sets</h2>
                <p className="text-sm text-gray-600">
                  Additional practice question sets
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSets.standalone.map((set) => (
                <QuestionSetCard
                  key={set.id}
                  questionSet={set}
                  onClick={() => navigate(`${basePath}/question-bank/${set.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {questionSets?.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Question Sets Available
            </h2>
            <p className="text-gray-600 mb-6">
              Question sets will appear here once they are published by the admin.
            </p>
            <Button onClick={() => navigate(basePath)}>
              Back to Learning System
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
