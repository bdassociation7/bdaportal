import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RotateCcw, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CertType = 'CP' | 'SCP';
type Domain = 'behavioral' | 'knowledge_based';

interface PoolRow {
  competency_section: Domain;
  competency_name: string;
  pool_en: number;
  pool_ar: number;
}

interface BlueprintRow {
  competency_section: Domain;
  competency_name: string;
  pool_en: number;
  pool_ar: number;
  question_count: number;
  order_index: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: load pool sizes + existing config for one cert type
// ─────────────────────────────────────────────────────────────────────────────

function useECOData(certType: CertType) {
  return useQuery({
    queryKey: ['eco-blueprint', certType],
    queryFn: async () => {
      // 1. Get quiz IDs for this cert type
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('id, exam_language')
        .eq('certification_type', certType)
        .eq('is_active', true);

      if (quizzesError) throw quizzesError;
      if (!quizzes || quizzes.length === 0) return { pool: [], config: [] };

      const enQuiz = quizzes.find(q => q.exam_language === 'en');
      const arQuiz = quizzes.find(q => q.exam_language === 'ar');

      // 2. Get pool sizes per competency per language
      const poolQueries = await Promise.all([
        enQuiz
          ? supabase
              .from('quiz_questions')
              .select('competency_section, competency_name')
              .eq('quiz_id', enQuiz.id)
              .not('competency_name', 'is', null)
          : { data: [] },
        arQuiz
          ? supabase
              .from('quiz_questions')
              .select('competency_section, competency_name')
              .eq('quiz_id', arQuiz.id)
              .not('competency_name', 'is', null)
          : { data: [] },
      ]);

      const enQuestions = poolQueries[0].data || [];
      const arQuestions = poolQueries[1].data || [];

      // Count per competency
      const countMap = (questions: any[]) => {
        const map: Record<string, { section: Domain; count: number }> = {};
        for (const q of questions) {
          if (!q.competency_name) continue;
          if (!map[q.competency_name]) {
            map[q.competency_name] = { section: q.competency_section as Domain, count: 0 };
          }
          map[q.competency_name].count++;
        }
        return map;
      };

      const enMap = countMap(enQuestions);
      const arMap = countMap(arQuestions);

      // Merge into pool rows — all competencies from either language
      const allCompetencies = new Set([...Object.keys(enMap), ...Object.keys(arMap)]);
      const pool: PoolRow[] = Array.from(allCompetencies).map(name => ({
        competency_section: enMap[name]?.section || arMap[name]?.section,
        competency_name: name,
        pool_en: enMap[name]?.count || 0,
        pool_ar: arMap[name]?.count || 0,
      }));

      // Sort: behavioral first, then knowledge_based; alphabetical within
      pool.sort((a, b) => {
        if (a.competency_section !== b.competency_section) {
          return a.competency_section === 'behavioral' ? -1 : 1;
        }
        return a.competency_name.localeCompare(b.competency_name);
      });

      // 3. Load existing blueprint config
      const { data: config, error: configError } = await supabase
        .from('eco_blueprint_config')
        .select('competency_name, question_count, order_index')
        .eq('certification_type', certType)
        .order('order_index');

      if (configError) throw configError;

      return { pool, config: config || [] };
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel for one certification type
// ─────────────────────────────────────────────────────────────────────────────

const EXAM_TOTAL = 120;

function BlueprintPanel({ certType }: { certType: CertType }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useECOData(certType);

  // Local editable state: map competency_name → question_count
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dirty, setDirty] = useState(false);

  // Initialise counts from loaded data
  useEffect(() => {
    if (!data) return;
    const initial: Record<string, number> = {};
    for (const row of data.pool) {
      const saved = data.config.find(c => c.competency_name === row.competency_name);
      initial[row.competency_name] = saved?.question_count ?? 0;
    }
    setCounts(initial);
    setDirty(false);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const rows = data.pool
        .filter(r => (counts[r.competency_name] ?? 0) > 0)
        .map((r, i) => ({
          certification_type: certType,
          domain: r.competency_section,
          competency_name: r.competency_name,
          question_count: counts[r.competency_name] ?? 0,
          order_index: i,
        }));

      const { error } = await supabase
        .from('eco_blueprint_config')
        .upsert(rows, { onConflict: 'certification_type,competency_name' });

      if (error) throw error;

      // Remove any competencies no longer in the blueprint (count = 0)
      const zeroNames = data.pool
        .filter(r => (counts[r.competency_name] ?? 0) === 0)
        .map(r => r.competency_name);

      if (zeroNames.length > 0) {
        await supabase
          .from('eco_blueprint_config')
          .delete()
          .eq('certification_type', certType)
          .in('competency_name', zeroNames);
      }
    },
    onSuccess: () => {
      toast({ title: 'Blueprint saved', description: `BDA-${certType} ECO blueprint updated.` });
      queryClient.invalidateQueries({ queryKey: ['eco-blueprint', certType] });
      setDirty(false);
    },
    onError: (err: any) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleReset = () => {
    if (!data) return;
    const initial: Record<string, number> = {};
    for (const row of data.pool) {
      const saved = data.config.find(c => c.competency_name === row.competency_name);
      initial[row.competency_name] = saved?.question_count ?? 0;
    }
    setCounts(initial);
    setDirty(false);
  };

  const handleChange = (name: string, value: string) => {
    const n = Math.max(0, parseInt(value) || 0);
    setCounts(prev => ({ ...prev, [name]: n }));
    setDirty(true);
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  if (error) return (
    <Alert variant="destructive">
      <AlertDescription>Failed to load data: {(error as any).message}</AlertDescription>
    </Alert>
  );
  if (!data || data.pool.length === 0) return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>No questions found for BDA-{certType}. Make sure the question banks are loaded.</AlertDescription>
    </Alert>
  );

  const behavioralRows = data.pool.filter(r => r.competency_section === 'behavioral');
  const knowledgeRows = data.pool.filter(r => r.competency_section === 'knowledge_based');

  const total = Object.values(counts).reduce((s, v) => s + (v || 0), 0);
  const behavioralTotal = behavioralRows.reduce((s, r) => s + (counts[r.competency_name] || 0), 0);
  const knowledgeTotal = knowledgeRows.reduce((s, r) => s + (counts[r.competency_name] || 0), 0);
  const totalOk = total === EXAM_TOTAL;

  const renderRows = (rows: PoolRow[]) =>
    rows.map(row => {
      const count = counts[row.competency_name] ?? 0;
      const minPool = Math.min(row.pool_en, row.pool_ar > 0 ? row.pool_ar : row.pool_en);
      const overPool = count > 0 && count > minPool;
      const overEn = count > 0 && count > row.pool_en;
      const overAr = row.pool_ar > 0 && count > row.pool_ar;

      return (
        <TableRow key={row.competency_name}>
          <TableCell className="font-medium">{row.competency_name}</TableCell>
          <TableCell className="text-center">
            <span className={row.pool_en < 8 ? 'text-amber-600 font-medium' : ''}>
              {row.pool_en}
            </span>
          </TableCell>
          <TableCell className="text-center">
            <span className={row.pool_ar > 0 && row.pool_ar < 8 ? 'text-amber-600 font-medium' : ''}>
              {row.pool_ar > 0 ? row.pool_ar : '—'}
            </span>
          </TableCell>
          <TableCell className="w-28">
            <Input
              type="number"
              min={0}
              max={Math.max(row.pool_en, row.pool_ar)}
              value={count || ''}
              placeholder="0"
              onChange={e => handleChange(row.competency_name, e.target.value)}
              className={`text-center ${overPool ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
          </TableCell>
          <TableCell className="text-center">
            {count === 0 ? (
              <span className="text-muted-foreground text-sm">—</span>
            ) : overEn || overAr ? (
              <div className="flex items-center gap-1 text-destructive text-sm">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overEn && overAr ? 'Exceeds EN & AR' : overEn ? 'Exceeds EN pool' : 'Exceeds AR pool'}
              </div>
            ) : overPool ? (
              <div className="flex items-center gap-1 text-amber-600 text-sm">
                <AlertTriangle className="h-3.5 w-3.5" />
                Check pool
              </div>
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
            )}
          </TableCell>
        </TableRow>
      );
    });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`text-lg font-semibold ${!totalOk ? 'text-destructive' : 'text-green-600'}`}>
            Total: {total} / {EXAM_TOTAL}
          </div>
          {!totalOk && (
            <Badge variant="destructive" className="text-xs">
              {total < EXAM_TOTAL ? `${EXAM_TOTAL - total} short` : `${total - EXAM_TOTAL} over`}
            </Badge>
          )}
          {totalOk && <Badge variant="outline" className="text-green-700 border-green-300 text-xs">Ready to save</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!dirty}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!totalOk || !dirty || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {saveMutation.isPending ? 'Saving…' : 'Save Blueprint'}
          </Button>
        </div>
      </div>

      {!totalOk && dirty && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Total must equal exactly {EXAM_TOTAL} questions. Current total: {total}.
          </AlertDescription>
        </Alert>
      )}

      {/* Behavioral domain */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold">Behavioral Domain</h3>
          <Badge variant="secondary">{behavioralTotal} questions ({Math.round(behavioralTotal / EXAM_TOTAL * 100)}%)</Badge>
          <span className="text-xs text-muted-foreground">Target: 45% = 54 questions</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competency</TableHead>
              <TableHead className="text-center w-20">Pool EN</TableHead>
              <TableHead className="text-center w-20">Pool AR</TableHead>
              <TableHead className="text-center w-28">Draw Count</TableHead>
              <TableHead className="text-center w-36">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderRows(behavioralRows)}
            <TableRow className="bg-muted/30">
              <TableCell colSpan={3} className="font-medium text-right text-sm text-muted-foreground">Behavioral subtotal</TableCell>
              <TableCell className="text-center font-semibold">{behavioralTotal}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Knowledge domain */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold">Knowledge Domain</h3>
          <Badge variant="secondary">{knowledgeTotal} questions ({Math.round(knowledgeTotal / EXAM_TOTAL * 100)}%)</Badge>
          <span className="text-xs text-muted-foreground">Target: 55% = 66 questions</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competency</TableHead>
              <TableHead className="text-center w-20">Pool EN</TableHead>
              <TableHead className="text-center w-20">Pool AR</TableHead>
              <TableHead className="text-center w-28">Draw Count</TableHead>
              <TableHead className="text-center w-36">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderRows(knowledgeRows)}
            <TableRow className="bg-muted/30">
              <TableCell colSpan={3} className="font-medium text-right text-sm text-muted-foreground">Knowledge subtotal</TableCell>
              <TableCell className="text-center font-semibold">{knowledgeTotal}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Pool EN / Pool AR</strong> = number of questions available in each language bank.
          Draw Count must not exceed either pool. Once saved, new exam attempts will draw exactly
          this many questions per competency, randomly selected.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ExamECOBlueprintManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ECO Blueprint Manager</h1>
        <p className="text-muted-foreground mt-1">
          Configure how many questions to draw per competency for each 120-question certification exam attempt.
        </p>
      </div>

      <Tabs defaultValue="CP">
        <TabsList>
          <TabsTrigger value="CP">BDA-CP (Certified Professional)</TabsTrigger>
          <TabsTrigger value="SCP">BDA-SCP (Senior Certified Professional)</TabsTrigger>
        </TabsList>

        <TabsContent value="CP" className="mt-6">
          <BlueprintPanel certType="CP" />
        </TabsContent>

        <TabsContent value="SCP" className="mt-6">
          <BlueprintPanel certType="SCP" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
