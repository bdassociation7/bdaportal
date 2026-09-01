import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DOMAIN_LABELS,
  buildExamResultDocumentFilename,
  formatCertificationType,
  formatDuration,
  formatExamLanguage,
  getCandidateDisplayName,
  getExamResultDocumentKind,
  getPreparationFocus,
  getPriorityCompetencies,
  getStrengthCompetencies,
  type ExamResultReportData,
} from './examResultReportModel';

const NAVY: [number, number, number] = [13, 31, 78];
const CHARCOAL: [number, number, number] = [32, 41, 56];
const GREY: [number, number, number] = [92, 103, 120];
const RULE: [number, number, number] = [207, 213, 220];
const LIGHT_GREY: [number, number, number] = [247, 248, 250];
const PAGE_MARGIN = 16;
const ARABIC_PATTERN = /[\u0600-\u06FF]/;

let cachedBrandLogo: string | null | undefined;
let cachedArabicFont: string | null | undefined;

function hasArabic(value: string): boolean {
  return ARABIC_PATTERN.test(value);
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function loadAsDataUrl(path: string): Promise<string | null> {
  try {
    const response = await fetch(path, { cache: 'force-cache' });
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function getBrandLogo(): Promise<string | null> {
  if (cachedBrandLogo !== undefined) return cachedBrandLogo;
  cachedBrandLogo = await loadAsDataUrl('/bda-logo.png');
  return cachedBrandLogo;
}

async function getArabicFont(): Promise<string | null> {
  if (cachedArabicFont !== undefined) return cachedArabicFont;

  try {
    const response = await fetch('/fonts/NotoSansArabic-Regular.ttf', { cache: 'force-cache' });
    if (!response.ok) {
      cachedArabicFont = null;
      return cachedArabicFont;
    }
    cachedArabicFont = toBase64(await response.arrayBuffer());
    return cachedArabicFont;
  } catch {
    cachedArabicFont = null;
    return cachedArabicFont;
  }
}

async function registerArabicFont(doc: jsPDF): Promise<boolean> {
  const font = await getArabicFont();
  if (!font) return false;

  try {
    doc.addFileToVFS('NotoSansArabic-Regular.ttf', font);
    doc.addFont('NotoSansArabic-Regular.ttf', 'NotoArabic', 'normal');
    return true;
  } catch {
    return false;
  }
}

function writeText(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  options: { align?: 'left' | 'center' | 'right'; fontSize?: number; style?: 'normal' | 'bold'; color?: [number, number, number]; arabicFontReady?: boolean } = {},
): void {
  const { align = 'left', fontSize = 10, style = 'normal', color = CHARCOAL, arabicFontReady = false } = options;
  const arabic = hasArabic(value) && arabicFontReady;

  doc.setTextColor(...color);
  doc.setFontSize(fontSize);
  doc.setFont(arabic ? 'NotoArabic' : 'helvetica', arabic ? 'normal' : style);
  doc.setR2L(arabic);
  doc.text(arabic ? doc.processArabic(value) : value, x, y, { align: arabic ? 'right' : align });
  doc.setR2L(false);
}

function writeWrappedText(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  options: { align?: 'left' | 'center' | 'right'; fontSize?: number; style?: 'normal' | 'bold'; color?: [number, number, number]; arabicFontReady?: boolean; lineHeight?: number } = {},
): number {
  const { align = 'left', fontSize = 9.5, style = 'normal', color = GREY, arabicFontReady = false, lineHeight = 5.2 } = options;
  const arabic = hasArabic(value) && arabicFontReady;

  doc.setFontSize(fontSize);
  doc.setFont(arabic ? 'NotoArabic' : 'helvetica', arabic ? 'normal' : style);
  const lines = doc.splitTextToSize(arabic ? doc.processArabic(value) : value, maxWidth) as string[];
  doc.setTextColor(...color);
  doc.setR2L(arabic);
  doc.text(lines, x, y, { align: arabic ? 'right' : align, lineHeightFactor: lineHeight / fontSize });
  doc.setR2L(false);
  return lines.length * lineHeight;
}

function drawRule(doc: jsPDF, y: number): void {
  const width = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.55);
  doc.line(PAGE_MARGIN, y, width - PAGE_MARGIN, y);
}

function drawFooter(doc: jsPDF, pageCount: number): void {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.25);
    doc.line(PAGE_MARGIN, height - 16, width - PAGE_MARGIN, height - 16);
    writeText(doc, 'Business Development Association (BDA) · Confidential examination result', PAGE_MARGIN, height - 10, { fontSize: 7.2, color: GREY });
    writeText(doc, `Page ${page} of ${pageCount}`, width - PAGE_MARGIN, height - 10, { align: 'right', fontSize: 7.2, color: GREY });
  }
}

async function drawDocumentHeader(doc: jsPDF, title: string, subtitle: string): Promise<number> {
  const width = doc.internal.pageSize.getWidth();
  const logo = await getBrandLogo();
  let y = 14;

  if (logo) {
    const properties = doc.getImageProperties(logo);
    const logoWidth = 29;
    const logoHeight = Math.max(7, (properties.height / properties.width) * logoWidth);
    doc.addImage(logo, 'PNG', (width - logoWidth) / 2, y, logoWidth, logoHeight);
    y += logoHeight + 7;
  } else {
    writeText(doc, 'BDA', width / 2, y + 6, { align: 'center', fontSize: 16, style: 'bold', color: NAVY });
    y += 13;
  }

  writeText(doc, 'BDA PORTAL', width / 2, y, { align: 'center', fontSize: 7.7, style: 'bold', color: NAVY });
  y += 7;
  writeText(doc, title, width / 2, y, { align: 'center', fontSize: 20, style: 'bold', color: NAVY });
  y += 6;
  writeText(doc, subtitle, width / 2, y, { align: 'center', fontSize: 8.6, color: GREY });
  y += 8;
  drawRule(doc, y);
  return y + 11;
}

function drawStatRow(
  doc: jsPDF,
  y: number,
  entries: Array<{ label: string; value: string }>,
): number {
  const width = doc.internal.pageSize.getWidth();
  const availableWidth = width - PAGE_MARGIN * 2;
  const cellWidth = availableWidth / entries.length;
  const height = 18;

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);

  entries.forEach((entry, index) => {
    const x = PAGE_MARGIN + index * cellWidth;
    doc.rect(x, y, cellWidth, height);
    writeText(doc, entry.label.toUpperCase(), x + 4, y + 6, { fontSize: 6.8, style: 'bold', color: NAVY });
    writeText(doc, entry.value, x + 4, y + 13, { fontSize: 10.8, style: 'bold', color: CHARCOAL });
  });

  return y + height;
}

function recommendationFor(competencyName: string, focus: string): string {
  if (focus === 'Maintain') return `Maintain strength in ${competencyName} through continued applied practice.`;
  return `Review the ${competencyName} module, competency summary, and related Flashcards before a future attempt.`;
}

function buildReportIntroduction(data: ExamResultReportData): string {
  const score = Math.round(data.attempt.score ?? 0);
  const standard = Math.round(data.attempt.passing_score_percentage ?? 70);
  return `Your score of ${score}% did not meet the ${standard}% BDA examination standard on this occasion. This report identifies priority development areas to guide focused preparation before a future attempt. It does not include examination questions, answer options, correct answers, or scoring keys.`;
}

async function buildSuccessDocument(doc: jsPDF, data: ExamResultReportData, arabicFontReady: boolean): Promise<void> {
  const width = doc.internal.pageSize.getWidth();
  const candidateName = getCandidateDisplayName(data.candidate);
  const certificate = formatCertificationType(data.exam.certification_type);
  const score = Math.round(data.attempt.score ?? 0);
  const standard = Math.round(data.attempt.passing_score_percentage ?? 70);
  const completedDate = new Date(data.attempt.completed_at ?? Date.now()).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  let y = await drawDocumentHeader(doc, 'Official Examination Result', `${certificate} · ${formatExamLanguage(data.exam.exam_language)} examination`);

  writeText(doc, 'CANDIDATE', PAGE_MARGIN, y, { fontSize: 7, style: 'bold', color: NAVY });
  writeText(doc, candidateName, hasArabic(candidateName) ? width - PAGE_MARGIN : PAGE_MARGIN, y + 9, { align: hasArabic(candidateName) ? 'right' : 'left', fontSize: 16.5, style: 'bold', color: CHARCOAL, arabicFontReady });
  writeText(doc, data.candidate.email, PAGE_MARGIN, y + 15, { fontSize: 8.3, color: GREY });

  writeText(doc, 'EXAMINATION STATUS', width - PAGE_MARGIN, y, { align: 'right', fontSize: 7, style: 'bold', color: NAVY });
  writeText(doc, 'PASSED', width - PAGE_MARGIN, y + 9, { align: 'right', fontSize: 16.5, style: 'bold', color: CHARCOAL });
  writeText(doc, 'Passing standard achieved', width - PAGE_MARGIN, y + 15, { align: 'right', fontSize: 8.3, color: GREY });

  y += 23;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.line(PAGE_MARGIN, y, width - PAGE_MARGIN, y);
  y += 16;

  writeText(doc, 'Congratulations on your successful result.', width / 2, y, { align: 'center', fontSize: 15.8, style: 'bold', color: NAVY });
  y += 8;
  y += writeWrappedText(
    doc,
    `You have met the ${certificate} examination standard. This document confirms your completed assessment outcome and is available from your BDA Portal account.`,
    width / 2,
    y,
    width - PAGE_MARGIN * 5,
    { align: 'center', fontSize: 9.6, color: GREY, lineHeight: 5.6 },
  );
  y += 14;

  y = drawStatRow(doc, y, [
    { label: 'Overall score', value: `${score}%` },
    { label: 'Passing standard', value: `${standard}%` },
    { label: 'Exam date', value: completedDate },
  ]);
  y += 9;
  y = drawStatRow(doc, y, [
    { label: 'Certification', value: certificate },
    { label: 'Exam language', value: formatExamLanguage(data.exam.exam_language) },
  ]);
  y += 15;

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.rect(PAGE_MARGIN, y, width - PAGE_MARGIN * 2, 28);
  writeText(doc, 'RECORD AND NEXT STEP', PAGE_MARGIN + 5, y + 7, { fontSize: 6.8, style: 'bold', color: NAVY });
  writeText(doc, 'Your BDA certification record is now available in your portal account.', PAGE_MARGIN + 5, y + 14, { fontSize: 9, style: 'bold', color: CHARCOAL });
  writeWrappedText(doc, 'Please retain this document for your records. Your official certificate and credential status remain subject to the applicable BDA certification policies.', PAGE_MARGIN + 5, y + 20, width - PAGE_MARGIN * 2 - 10, { fontSize: 7.8, color: GREY, lineHeight: 4.6 });

  writeText(doc, 'This document confirms an examination result only. It does not disclose confidential examination content.', width / 2, 265, { align: 'center', fontSize: 7.5, color: GREY });
}

async function buildDevelopmentReport(doc: jsPDF, data: ExamResultReportData, arabicFontReady: boolean): Promise<void> {
  const width = doc.internal.pageSize.getWidth();
  const candidateName = getCandidateDisplayName(data.candidate);
  const certificate = formatCertificationType(data.exam.certification_type);
  const score = Math.round(data.attempt.score ?? 0);
  const standard = Math.round(data.attempt.passing_score_percentage ?? 70);
  const priorities = getPriorityCompetencies(data.competency_performance, 6);
  const strengths = getStrengthCompetencies(data.competency_performance, 2);
  let y = await drawDocumentHeader(doc, 'Candidate Development Report', `${certificate} examination result`);

  writeText(doc, 'CANDIDATE', PAGE_MARGIN, y, { fontSize: 7, style: 'bold', color: NAVY });
  writeText(doc, candidateName, hasArabic(candidateName) ? width - PAGE_MARGIN : PAGE_MARGIN, y + 9, { align: hasArabic(candidateName) ? 'right' : 'left', fontSize: 16.5, style: 'bold', color: CHARCOAL, arabicFontReady });
  writeText(doc, data.candidate.email, PAGE_MARGIN, y + 15, { fontSize: 8.3, color: GREY });

  writeText(doc, 'EXAMINATION STATUS', width - PAGE_MARGIN, y, { align: 'right', fontSize: 7, style: 'bold', color: NAVY });
  writeText(doc, 'NOT YET PASSED', width - PAGE_MARGIN, y + 9, { align: 'right', fontSize: 16.5, style: 'bold', color: CHARCOAL });
  writeText(doc, 'Development report available', width - PAGE_MARGIN, y + 15, { align: 'right', fontSize: 8.3, color: GREY });

  y += 23;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.line(PAGE_MARGIN, y, width - PAGE_MARGIN, y);
  y += 10;

  y = drawStatRow(doc, y, [
    { label: 'Overall score', value: `${score}%` },
    { label: 'Passing standard', value: `${standard}%` },
    { label: 'Points earned', value: `${data.attempt.total_points_earned ?? 0} / ${data.attempt.total_points_possible ?? 0}` },
    { label: 'Exam language', value: formatExamLanguage(data.exam.exam_language) },
  ]);
  y += 12;

  writeText(doc, 'Your result', PAGE_MARGIN, y, { fontSize: 13.4, style: 'bold', color: NAVY });
  y += 7;
  y += writeWrappedText(doc, buildReportIntroduction(data), PAGE_MARGIN, y, width - PAGE_MARGIN * 2, { fontSize: 9.2, color: GREY, lineHeight: 5.4 });
  y += 8;

  writeText(doc, 'Performance by domain', PAGE_MARGIN, y, { fontSize: 13.4, style: 'bold', color: NAVY });
  y += 4;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Domain', 'Score', 'Preparation focus']],
    body: data.domain_performance.map((domain) => [
      DOMAIN_LABELS[domain.domain] || domain.domain,
      `${Math.round(domain.score_percentage)}%`,
      domain.score_percentage >= standard ? 'Maintain and apply this strength.' : 'Revisit the related Learning System modules and practice resources.',
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.2, cellPadding: 3.2, lineColor: RULE, lineWidth: 0.25, textColor: CHARCOAL, valign: 'middle' },
    headStyles: { fillColor: LIGHT_GREY, textColor: NAVY, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 44 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 'auto' } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  writeText(doc, 'Preparation priorities', PAGE_MARGIN, y, { fontSize: 13.4, style: 'bold', color: NAVY });
  y += 4;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    body: priorities.slice(0, 2).map((competency, index) => [
      String(index + 1).padStart(2, '0'),
      competency.competency_name,
      `Strengthen this competency through the Learning System module, competency summary, and related Flashcards.`,
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.3, cellPadding: 3.4, lineColor: RULE, lineWidth: 0.25, textColor: CHARCOAL, valign: 'middle' },
    columnStyles: { 0: { cellWidth: 16, halign: 'center' }, 1: { cellWidth: 57 }, 2: { cellWidth: 'auto' } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  const strengthText = strengths.length > 0
    ? `Continue building on your stronger performance in ${strengths.map((item) => item.competency_name).join(' and ')} while you address the priority areas above.`
    : 'Continue building on your strongest areas while you address the preparation priorities above.';
  writeText(doc, 'Strength to retain', PAGE_MARGIN, y, { fontSize: 13.4, style: 'bold', color: NAVY });
  y += 6;
  writeWrappedText(doc, strengthText, PAGE_MARGIN, y, width - PAGE_MARGIN * 2, { fontSize: 8.8, color: GREY, lineHeight: 5.1 });

  doc.addPage();
  y = 24;
  writeText(doc, 'Focused development plan', width / 2, y, { align: 'center', fontSize: 16, style: 'bold', color: NAVY });
  y += 6;
  writeText(doc, 'Use this plan to structure targeted preparation before a future examination attempt.', width / 2, y, { align: 'center', fontSize: 8.4, color: GREY });
  y += 8;

  const focusRows = priorities.map((competency) => [
    competency.competency_name,
    `${Math.round(competency.score_percentage)}%`,
    getPreparationFocus(competency.performance_level),
    recommendationFor(competency.competency_name, getPreparationFocus(competency.performance_level)),
  ]);
  strengths.forEach((competency) => {
    if (!focusRows.some((row) => row[0] === competency.competency_name)) {
      focusRows.push([
        competency.competency_name,
        `${Math.round(competency.score_percentage)}%`,
        'Maintain',
        recommendationFor(competency.competency_name, 'Maintain'),
      ]);
    }
  });

  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Competency', 'Score', 'Focus', 'Recommended preparation']],
    body: focusRows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, lineColor: RULE, lineWidth: 0.25, textColor: CHARCOAL, valign: 'middle' },
    headStyles: { fillColor: LIGHT_GREY, textColor: NAVY, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 28, halign: 'center' }, 3: { cellWidth: 'auto' } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  writeText(doc, 'Recommended next steps', PAGE_MARGIN, y, { fontSize: 13.4, style: 'bold', color: NAVY });
  y += 4;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    body: [
      ['01', 'Review the Learning System', 'Return to the priority competency modules and their summary lessons.'],
      ['02', 'Practise with learning resources', 'Use Flashcards and practice activities to apply concepts in new business-development contexts.'],
      ['03', 'Prepare for a future attempt', 'Schedule a future examination attempt when preparation is complete.'],
    ],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.2, cellPadding: 3.2, lineColor: RULE, lineWidth: 0.25, textColor: CHARCOAL, valign: 'middle' },
    columnStyles: { 0: { cellWidth: 16, halign: 'center' }, 1: { cellWidth: 50 }, 2: { cellWidth: 'auto' } },
  });
  y = (doc as any).lastAutoTable.finalY + 11;

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.rect(PAGE_MARGIN, y, width - PAGE_MARGIN * 2, 22);
  writeText(doc, 'IMPORTANT NOTE', PAGE_MARGIN + 5, y + 6, { fontSize: 6.8, style: 'bold', color: NAVY });
  writeWrappedText(doc, 'This development report provides competency-level feedback to support preparation. It does not disclose confidential examination questions, answer options, correct answers, scoring keys, or other protected examination content.', PAGE_MARGIN + 5, y + 12, width - PAGE_MARGIN * 2 - 10, { fontSize: 7.6, color: GREY, lineHeight: 4.3 });
}

export async function createExamResultPdfDocument(data: ExamResultReportData): Promise<{ doc: jsPDF; kind: 'success' | 'development'; pageCount: number }> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const arabicFontReady = await registerArabicFont(doc);
  const kind = getExamResultDocumentKind(data.attempt);

  if (kind === 'success') {
    await buildSuccessDocument(doc, data, arabicFontReady);
  } else {
    await buildDevelopmentReport(doc, data, arabicFontReady);
  }

  const pageCount = doc.internal.getNumberOfPages();
  drawFooter(doc, pageCount);
  return { doc, kind, pageCount };
}

export async function generateExamResultPdf(data: ExamResultReportData): Promise<{ kind: 'success' | 'development'; pageCount: number }> {
  const { doc, kind, pageCount } = await createExamResultPdfDocument(data);
  doc.save(buildExamResultDocumentFilename(data));
  return { kind, pageCount };
}
