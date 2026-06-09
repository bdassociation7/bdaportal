/**
 * Lesson Quiz Manager
 * Admin page to manage lesson validation quizzes
 * Dynamically loads lessons and their linked quizzes
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, BookOpen, Link as LinkIcon, Unlink, ExternalLink, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AdminPageHeader, StatCard, AdminFilterCard } from '../components/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLessons } from '@/entities/curriculum';
import { useActiveQuizzes } from '@/entities/quiz';
import { useQuery } from '@tanstack/react-query';
import { CurriculumService, curriculumKeys } from '@/entities/curriculum';

export function LessonQuizManager() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [certType, setCertType] = useState<'CP' | 'SCP' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const t = {
    en: {
      title: 'Lesson Validation Quizzes',
      description: 'Manage quizzes for lesson validation',
      createQuiz: 'Create Quiz',
      search: 'Search lessons...',
      filters: 'Filters',
      filterDescription: 'Search and filter lesson quizzes',
      filterModule: 'Filter by Module',
      allModules: 'All Modules',
      lesson: 'Lesson',
      module: 'Module',
      quiz: 'Quiz',
      status: 'Status',
      actions: 'Actions',
      linked: 'Linked',
      notLinked: 'Not Linked',
      linkQuiz: 'Link Quiz',
      viewQuiz: 'View Quiz',
      editLesson: 'Edit Lesson',
      allCerts: 'All',
      totalLessons: 'Total Lessons',
      linkedQuizzes: 'Linked Quizzes',
      missingQuizzes: 'Missing Quizzes',
      loading: 'Loading...',
      noLessonsFound: 'No lessons found',
    },
    ar: {
      title: 'اختبارات التحقق من الدروس',
      description: 'إدارة الاختبارات للتحقق من الدروس',
      createQuiz: 'إنشاء اختبار',
      search: 'البحث في الدروس...',
      filters: 'الفلاتر',
      filterDescription: 'البحث والتصفية في اختبارات الدروس',
      filterModule: 'تصفية حسب الوحدة',
      allModules: 'جميع الوحدات',
      lesson: 'الدرس',
      module: 'الوحدة',
      quiz: 'الاختبار',
      status: 'الحالة',
      actions: 'الإجراءات',
      linked: 'مرتبط',
      notLinked: 'غير مرتبط',
      linkQuiz: 'ربط اختبار',
      viewQuiz: 'عرض الاختبار',
      editLesson: 'تحرير الدرس',
      allCerts: 'الكل',
      totalLessons: 'إجمالي الدروس',
      linkedQuizzes: 'الاختبارات المرتبطة',
      missingQuizzes: 'الاختبارات المفقودة',
      loading: 'جارٍ التحميل...',
      noLessonsFound: 'لم يتم العثور على دروس',
    }
  };

  const texts = t[language];

  // Load all modules for filter
  const { data: allModules } = useQuery({
    queryKey: curriculumKeys.modulesList({}),
    queryFn: async () => {
      const result = await CurriculumService.getModules({});
      return result.data || [];
    },
  });

  // Load lessons with filters
  const { data: lessons, isLoading } = useLessons({
    certification_type: certType === 'all' ? undefined : certType,
    module_id: moduleFilter === 'all' ? undefined : moduleFilter,
  });

  // Load all quizzes
  // exclude_certification=true: formal certification exams must not appear in lesson quiz dropdowns
  const { data: quizzes } = useActiveQuizzes({ exclude_certification: true });

  // Filter lessons by search
  const filteredLessons = lessons?.filter(lesson =>
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lesson.title_ar?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calculate stats
  const totalLessons = filteredLessons.length;
  const linkedCount = filteredLessons.filter(l => l.lesson_quiz_id).length;
  const missingCount = totalLessons - linkedCount;

  // Get quiz details
  const getQuizName = (quizId: string | null) => {
    if (!quizId) return null;
    const quiz = quizzes?.find(q => q.id === quizId);
    return quiz?.title || quiz?.title_ar || quizId;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title={texts.title}
        description={texts.description}
        icon={HelpCircle}
        action={
          <Button
            onClick={() => navigate('/admin/quizzes/new?type=lesson_validation')}
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            {texts.createQuiz}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label={texts.totalLessons}
          value={totalLessons}
          icon={BookOpen}
          color="gray"
        />
        <StatCard
          label={texts.linkedQuizzes}
          value={linkedCount}
          icon={LinkIcon}
          color="green"
        />
        <StatCard
          label={texts.missingQuizzes}
          value={missingCount}
          icon={Unlink}
          color="amber"
        />
      </div>

      {/* Filters */}
      <AdminFilterCard
        title={texts.filters}
        description={texts.filterDescription}
        onReset={() => {
          setSearchQuery('');
          setCertType('all');
          setModuleFilter('all');
        }}
      >
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={texts.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Certification Type */}
        <Select value={certType} onValueChange={(v: any) => setCertType(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{texts.allCerts}</SelectItem>
            <SelectItem value="CP">CP</SelectItem>
            <SelectItem value="SCP">SCP</SelectItem>
          </SelectContent>
        </Select>

        {/* Module Filter */}
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger>
            <SelectValue placeholder={texts.filterModule} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{texts.allModules}</SelectItem>
            {allModules?.map((module) => (
              <SelectItem key={module.id} value={module.id}>
                {module.competency_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterCard>

      {/* Lessons Table */}
      <Card>
        <CardHeader>
          <CardTitle>{texts.totalLessons}: {filteredLessons.length}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{texts.loading}</div>
          ) : filteredLessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{texts.noLessonsFound}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{texts.lesson}</TableHead>
                  <TableHead>{texts.module}</TableHead>
                  <TableHead>{texts.quiz}</TableHead>
                  <TableHead>{texts.status}</TableHead>
                  <TableHead className="text-right">{texts.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLessons.map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lesson.title}</div>
                        {lesson.title_ar && (
                          <div className="text-sm text-muted-foreground">{lesson.title_ar}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lesson.module?.competency_name || lesson.module_id}
                    </TableCell>
                    <TableCell>
                      {lesson.lesson_quiz_id ? (
                        <div className="text-sm">
                          {getQuizName(lesson.lesson_quiz_id)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lesson.lesson_quiz_id ? (
                        <Badge variant="default" className="bg-green-600">
                          <LinkIcon className="mr-1 h-3 w-3" />
                          {texts.linked}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Unlink className="mr-1 h-3 w-3" />
                          {texts.notLinked}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lesson.lesson_quiz_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/admin/quizzes/${lesson.lesson_quiz_id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/curriculum/lessons?editId=${lesson.id}`)}
                        >
                          {lesson.lesson_quiz_id ? texts.viewQuiz : texts.linkQuiz}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
