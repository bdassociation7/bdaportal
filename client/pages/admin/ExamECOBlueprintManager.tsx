import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/app/providers/AuthProvider';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Info,
  FlaskConical,
  Play,
  XCircle,
} from 'lucide-react';

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

interface SimResultRow {
  competency_name: string;
  domain: Domain;
  requested: number;
  available_en: number;
  available_ar: number;
  drawn_en: number;          // min(requested, pool_en)
  drawn_ar: number | null;   // min(requested, pool_ar), null if no AR bank
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
      if (!quizzes || quizzes.length === 0) return { pool: [], config: [], enQuizId: null, arQuizId: null };

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

      // 2b. Count untagged questions per language (competency_name IS NULL)
      const untaggedCounts = await Promise.all([
        enQuiz
          ? supabase
              .from('quiz_questions')
              .select('id', { count: 'exact', head: true })
              .eq('quiz_id', enQuiz.id)
              .is('competency_name', null)
          : { count: 0 },
        arQuiz
          ? supabase
              .from('quiz_questions')
              .select('id', { count: 'exact', head: true })
              .eq('quiz_id', arQuiz.id)
              .is('competency_name', null)
          : { count: 0 },
      ]);
      const untaggedEn = untaggedCounts[0].count ?? 0;
      const untaggedAr = untaggedCounts[1].count ?? 0;

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

      return {
        pool,
        config: config || [],
        enQuizId: enQuiz?.id || null,
        arQuizId: arQuiz?.id || null,
        untaggedEn,
        untaggedAr,
      };
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation modal
// ─────────────────────────────────────────────────────────────────────────────

function SimulateModal({
  open,
  onClose,
  certType,
  results,
}: {
  open: boolean;
  onClose: () => void;
  certType: CertType;
  results: SimResultRow[];
}) {
  const totalRequested = results.reduce((s, r) => s + r.requested, 0);
  const totalDrawnEn = results.reduce((s, r) => s + r.drawn_en, 0);
  const totalDrawnAr = results.some(r => r.drawn_ar !== null)
    ? results.reduce((s, r) => s + (r.drawn_ar ?? 0), 0)
    : null;

  const hasArBank = results.some(r => r.drawn_ar !== null);
  const enOk = results.every(r => r.drawn_en === r.requested);
  const arOk = !hasArBank || results.every(r => r.drawn_ar === null || r.drawn_ar === r.requested);
  const allOk = enOk && arOk;

  const rowStatus = (row: SimResultRow) => {
    const enShortfall = row.requested - row.drawn_en;
    const arShortfall = row.drawn_ar !== null ? row.requested - row.drawn_ar : 0;
    if (enShortfall === 0 && arShortfall === 0) return 'ok';
    if (enShortfall > 0 && arShortfall > 0) return `EN −${enShortfall} / AR −${arShortfall}`;
    if (enShortfall > 0) return `EN −${enShortfall}`;
    return `AR −${arShortfall}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Draw Simulation — BDA-{certType}</DialogTitle>
          <DialogDescription>
            Verifies whether the saved blueprint can be satisfied by both the EN and AR question banks.
            No attempt is created — read-only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Summary */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={enOk ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}>
              {enOk ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
              EN: {totalDrawnEn} / {totalRequested}
            </Badge>
            {hasArBank && (
              <Badge className={arOk ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}>
                {arOk ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                AR: {totalDrawnAr} / {totalRequested}
              </Badge>
            )}
            {allOk && (
              <span className="text-sm text-green-700 font-medium">Blueprint is valid for all language banks.</span>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competency</TableHead>
                <TableHead className="text-center w-16">Req.</TableHead>
                <TableHead className="text-center w-20">Pool EN</TableHead>
                <TableHead className="text-center w-20">Drawn EN</TableHead>
                <TableHead className="text-center w-20">Pool AR</TableHead>
                <TableHead className="text-center w-20">Drawn AR</TableHead>
                <TableHead className="text-center w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(row => {
                const status = rowStatus(row);
                return (
                  <TableRow key={row.competency_name}>
                    <TableCell className="font-medium text-sm">{row.competency_name}</TableCell>
                    <TableCell className="text-center text-sm">{row.requested}</TableCell>
                    {/* EN */}
                    <TableCell className="text-center text-sm">
                      <span className={row.available_en < row.requested ? 'text-destructive font-medium' : ''}>
                        {row.available_en}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold">
                      <span className={row.drawn_en < row.requested ? 'text-destructive' : 'text-green-700'}>
                        {row.drawn_en}
                      </span>
                    </TableCell>
                    {/* AR */}
                    <TableCell className="text-center text-sm">
                      {row.available_ar > 0 ? (
                        <span className={row.available_ar < row.requested ? 'text-destructive font-medium' : ''}>
                          {row.available_ar}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold">
                      {row.drawn_ar !== null ? (
                        <span className={row.drawn_ar < row.requested ? 'text-destructive' : 'text-green-700'}>
                          {row.drawn_ar}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    {/* Status */}
                    <TableCell className="text-center">
                      {status === 'ok' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-destructive text-xs whitespace-nowrap">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          {status}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Total row */}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell className="text-right text-sm text-muted-foreground" colSpan={3}>
                  Total
                </TableCell>
                <TableCell className="text-center">
                  <span className={totalDrawnEn === totalRequested ? 'text-green-700' : 'text-destructive'}>
                    {totalDrawnEn}
                  </span>
                </TableCell>
                <TableCell />
                <TableCell className="text-center">
                  {totalDrawnAr !== null ? (
                    <span className={totalDrawnAr === totalRequested ? 'text-green-700' : 'text-destructive'}>
                      {totalDrawnAr}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-center">
                  {allOk ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive mx-auto" />
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Drawn EN / Drawn AR</strong> = min(Requested, Pool) per language.
              Both must equal Requested for the blueprint to work for all candidates.
              Actual question selection is random per attempt — only the counts are fixed.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel for one certification type
// ─────────────────────────────────────────────────────────────────────────────

const EXAM_TOTAL = 120;

function BlueprintPanel({ certType }: { certType: CertType }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { data, isLoading, error } = useECOData(certType);

  // Local editable state: map competency_name → question_count
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dirty, setDirty] = useState(false);

  // Simulation state
  const [simOpen, setSimOpen] = useState(false);
  const [simResults, setSimResults] = useState<SimResultRow[]>([]);
  const [simLoading, setSimLoading] = useState(false);

  // Test attempt state
  const [startingAttempt, setStartingAttempt] = useState<'en' | 'ar' | null>(null);

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

  // ── Option 1: Simulate Draw ───────────────────────────────────────────────

  const handleSimulate = async () => {
    if (!data) return;
    setSimLoading(true);
    try {
      // Load saved blueprint from DB (not dirty local state — sim uses what's actually saved)
      const { data: savedConfig } = await supabase
        .from('eco_blueprint_config')
        .select('competency_name, question_count')
        .eq('certification_type', certType);

      if (!savedConfig || savedConfig.length === 0) {
        toast({
          title: 'No blueprint saved',
          description: 'Save the blueprint first before running a simulation.',
          variant: 'destructive',
        });
        return;
      }

      const configMap = Object.fromEntries(savedConfig.map(c => [c.competency_name, c.question_count]));

      // Build simulation results using pool data already loaded
      const results: SimResultRow[] = data.pool
        .filter(r => (configMap[r.competency_name] ?? 0) > 0)
        .map(r => {
          const requested = configMap[r.competency_name];
          return {
            competency_name: r.competency_name,
            domain: r.competency_section,
            requested,
            available_en: r.pool_en,
            available_ar: r.pool_ar,
            drawn_en: Math.min(requested, r.pool_en),
            drawn_ar: r.pool_ar > 0 ? Math.min(requested, r.pool_ar) : null,
          };
        });

      setSimResults(results);
      setSimOpen(true);
    } finally {
      setSimLoading(false);
    }
  };

  // ── Option 2: Start Test Attempt ─────────────────────────────────────────

  const handleStartTestAttempt = async (lang: 'en' | 'ar') => {
    if (!user?.id) return;
    const quizId = lang === 'en' ? data?.enQuizId : data?.arQuizId;
    if (!quizId) {
      toast({ title: `No ${lang.toUpperCase()} quiz found for BDA-${certType}`, variant: 'destructive' });
      return;
    }

    const confirmed = window.confirm(
      `This will create a real exam attempt under your account (BDA-${certType} ${lang.toUpperCase()}).\n\nThe attempt will appear in your quiz history. You can abandon it at any time.\n\nContinue?`
    );
    if (!confirmed) return;

    setStartingAttempt(lang);
    try {
      const { data: attempt, error } = await supabase.rpc('start_certification_exam', {
        p_user_id: user.id,
        p_quiz_id: quizId,
        p_voucher_id: null,
        p_booking_id: null,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
        p_browser_info: null,
      });

      if (error) throw error;

      toast({
        title: 'Test attempt created',
        description: `BDA-${certType} ${lang.toUpperCase()} — opening exam…`,
        duration: 3000,
      });

      navigate(`/certification/exam/${quizId}/attempt/${attempt.id}`, {
        state: { adminReturnPath: '/admin/exams/eco-blueprint' },
      });
    } catch (err: any) {
      toast({
        title: 'Failed to start test attempt',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setStartingAttempt(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

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

  const hasSavedBlueprint = data.config.length > 0;

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
          {/* Option 1: Simulate Draw */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulate}
            disabled={simLoading || !hasSavedBlueprint}
            title={!hasSavedBlueprint ? 'Save a blueprint first' : 'Simulate a draw using the saved blueprint'}
          >
            <FlaskConical className="h-4 w-4 mr-1" />
            {simLoading ? 'Simulating…' : 'Simulate Draw'}
          </Button>

          {/* Option 2: Start Test Attempt — EN and AR */}
          {data.enQuizId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStartTestAttempt('en')}
              disabled={!!startingAttempt || !hasSavedBlueprint}
              title={!hasSavedBlueprint ? 'Save a blueprint first' : `Open a real BDA-${certType} EN exam attempt under your account`}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Play className="h-4 w-4 mr-1" />
              {startingAttempt === 'en' ? 'Starting…' : 'Test EN'}
            </Button>
          )}
          {data.arQuizId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStartTestAttempt('ar')}
              disabled={!!startingAttempt || !hasSavedBlueprint}
              title={!hasSavedBlueprint ? 'Save a blueprint first' : `Open a real BDA-${certType} AR exam attempt under your account`}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Play className="h-4 w-4 mr-1" />
              {startingAttempt === 'ar' ? 'Starting…' : 'Test AR'}
            </Button>
          )}

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

      {((data.untaggedEn ?? 0) > 0 || (data.untaggedAr ?? 0) > 0) && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            <strong>Untagged questions detected:</strong>{' '}
            {(data.untaggedEn ?? 0) > 0 && (
              <span>EN bank: <strong>{data.untaggedEn}</strong> question{data.untaggedEn !== 1 ? 's' : ''} missing a competency. </span>
            )}
            {(data.untaggedAr ?? 0) > 0 && (
              <span>AR bank: <strong>{data.untaggedAr}</strong> question{data.untaggedAr !== 1 ? 's' : ''} missing a competency. </span>
            )}
            These questions will not be drawn by the blueprint engine. Assign them a competency in the question bank to include them.
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
          {hasSavedBlueprint && (
            <> Use <strong>Simulate Draw</strong> to verify the blueprint without creating an attempt,
            or <strong>Start Test Attempt</strong> to open a real exam and inspect the drawn questions.</>
          )}
        </AlertDescription>
      </Alert>

      {/* Simulation results modal */}
      <SimulateModal
        open={simOpen}
        onClose={() => setSimOpen(false)}
        certType={certType}
        results={simResults}
      />
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
