import { Request, Response } from "express";
import mammoth from "mammoth";

// ─── Competency mappings (EN + AR) ──────────────────────────────────────────
const COMPETENCY_MAP_EN: Record<string, string> = {
  "Strategic Leadership": "Strategic Leadership",
  "Business Acumen": "Business Acumen",
  "Effective Communication": "Effective Communication",
  "Emotional Intelligence": "Emotional Intelligence (EQ)",
  "Emotional Intelligence (EQ)": "Emotional Intelligence (EQ)",
  "Critical Thinking & Problem Solving": "Critical Thinking & Problem Solving",
  "Critical Thinking and Problem Solving": "Critical Thinking & Problem Solving",
  "Creative Thinking and Problem-Solving": "Critical Thinking & Problem Solving",
  "Creative Thinking & Problem-Solving": "Critical Thinking & Problem Solving",
  "Consultative Mindset": "Consultative Mindset",
  "Negotiation & Relationship Management": "Negotiation & Relationship Management",
  "Negotiation and Relationship Management": "Negotiation & Relationship Management",
  "Growth & Expansion Strategies": "Growth & Expansion Strategies",
  "Growth and Expansion Strategies": "Growth & Expansion Strategies",
  "Innovation in Business Development": "Innovation in Business Development",
  "Market & Competitive Analysis": "Market & Competitive Analysis",
  "Market and Competitive Analysis": "Market & Competitive Analysis",
  "Business Project Management": "Business Project Management",
  "Business Project Management for BD": "Business Project Management",
  "Financial & Pricing Models": "Financial & Pricing Models",
  "Financial and Pricing Models": "Financial & Pricing Models",
  "Pricing and Financial Models": "Financial & Pricing Models",
  "Marketing & Sales Strategies": "Marketing & Sales Strategies",
  "Marketing and Sales Strategies": "Marketing & Sales Strategies",
  "Marketing and Sales Strategy Alignment": "Marketing & Sales Strategies",
  "Marketing & Sales Strategy Alignment": "Marketing & Sales Strategies",
  "Legal & Compliance in Business Development": "Legal & Compliance in Business Development",
  "Legal and Compliance in Business Development": "Legal & Compliance in Business Development",
  "Legal and Compliance Fundamentals": "Legal & Compliance in Business Development",
  "Legal & Compliance Fundamentals": "Legal & Compliance in Business Development",
};

const COMPETENCY_MAP_AR: Record<string, string> = {
  "القيادة الاستراتيجية": "Strategic Leadership",
  "الفطنة التجارية": "Business Acumen",
  "التواصل الفعال": "Effective Communication",
  "الذكاء العاطفي": "Emotional Intelligence (EQ)",
  "الذكاء العاطفي (EQ)": "Emotional Intelligence (EQ)",
  "التفكير النقدي وحل المشكلات": "Critical Thinking & Problem Solving",
  "التفكير الإبداعي وحل المشكلات": "Critical Thinking & Problem Solving",
  "العقلية الاستشارية": "Consultative Mindset",
  "التفاوض وإدارة العلاقات": "Negotiation & Relationship Management",
  "استراتيجيات النمو والتوسع": "Growth & Expansion Strategies",
  "الابتكار في تطوير الأعمال": "Innovation in Business Development",
  "تحليل السوق والمنافسة": "Market & Competitive Analysis",
  "إدارة مشاريع الأعمال": "Business Project Management",
  "إدارة مشاريع الأعمال التجارية": "Business Project Management",
  "إدارة مشاريع الأعمال لتطوير الأعمال": "Business Project Management",
  "النماذج المالية والتسعير": "Financial & Pricing Models",
  "التسعير والنماذج المالية": "Financial & Pricing Models",
  "نماذج التسعير والمالية": "Financial & Pricing Models",
  "استراتيجيات التسويق والمبيعات": "Marketing & Sales Strategies",
  "مواءمة استراتيجية التسويق والمبيعات": "Marketing & Sales Strategies",
  "الجوانب القانونية والامتثال": "Legal & Compliance in Business Development",
  "أساسيات الشؤون القانونية والامتثال": "Legal & Compliance in Business Development",
  "الامتثال القانوني وأساسياته": "Legal & Compliance in Business Development",
};

const BEHAVIORAL_COMPETENCIES = new Set([
  "Strategic Leadership",
  "Business Acumen",
  "Effective Communication",
  "Emotional Intelligence (EQ)",
  "Critical Thinking & Problem Solving",
  "Consultative Mindset",
  "Negotiation & Relationship Management",
]);

const AR_LETTER_MAP: Record<string, string> = {
  أ: "A",
  ب: "B",
  ج: "C",
  د: "D",
};

// ─── Parsers ─────────────────────────────────────────────────────────────────
function parseEN(paragraphs: string[]) {
  const questions: any[] = [];
  let current: any = null;

  for (let i = 0; i < paragraphs.length; i++) {
    const line = paragraphs[i];

    // Question start
    const qMatch = line.match(/^Question\s+(\d+)[:\s](.+)/s);
    if (qMatch) {
      if (current && current.answers?.length) questions.push(current);
      current = {
        number: parseInt(qMatch[1]),
        question_text: qMatch[2].trim(),
        answers: [],
        correct_answer: null,
        competency: null,
      };
      continue;
    }

    if (!current) continue;

    // Answers block (combined in one paragraph with \n)
    if (!current.answers.length && /^[A-D]\)/.test(line)) {
      const lines = line.split("\n");
      let curAns: any = null;
      for (const l of lines) {
        const t = l.trim();
        if (!t) continue;
        const am = t.match(/^([A-D])\)\s*(.+)/);
        if (am) {
          if (curAns) current.answers.push(curAns);
          curAns = { letter: am[1], text: `${am[1]}) ${am[2].trim()}` };
        } else if (curAns) {
          curAns.text += " " + t;
        }
      }
      if (curAns) current.answers.push(curAns);
      continue;
    }

    // Correct answer
    const caMatch = line.match(/^Correct Answer[:\s]+([A-D])/);
    if (caMatch) { current.correct_answer = caMatch[1]; continue; }

    // Competency
    const compMatch = line.match(/^Competency[:\s]+(.+)/);
    if (compMatch) { current.competency = compMatch[1].trim(); continue; }

    // Skip rationale
    if (line.startsWith("Rationale")) continue;

    // Append to question text if no answers yet
    if (!current.answers.length) {
      current.question_text += " " + line;
    }
  }
  if (current && current.answers?.length) questions.push(current);
  return questions;
}

function parseAR(paragraphs: string[]) {
  const questions: any[] = [];
  let current: any = null;

  for (let i = 0; i < paragraphs.length; i++) {
    const line = paragraphs[i];

    const qMatch = line.match(/^السؤال\s+(\d+)[:\s](.+)/s);
    if (qMatch) {
      if (current && current.answers?.length) questions.push(current);
      current = {
        number: parseInt(qMatch[1]),
        question_text: qMatch[2].trim(),
        answers: [],
        correct_answer: null,
        competency: null,
      };
      continue;
    }

    if (!current) continue;

    if (!current.answers.length && /^[أبجد]\)/.test(line)) {
      const lines = line.split("\n");
      let curAns: any = null;
      for (const l of lines) {
        const t = l.trim();
        if (!t) continue;
        const am = t.match(/^([أبجد])\)\s*(.+)/);
        if (am) {
          if (curAns) current.answers.push(curAns);
          const letterEn = AR_LETTER_MAP[am[1]] || am[1];
          curAns = { letter: letterEn, text: `${am[1]}) ${am[2].trim()}` };
        } else if (curAns) {
          curAns.text += " " + t;
        }
      }
      if (curAns) current.answers.push(curAns);
      continue;
    }

    const caMatch = line.match(/^الإجابة الصحيحة[:\s]+([أبجد])/);
    if (caMatch) {
      current.correct_answer = AR_LETTER_MAP[caMatch[1]] || "A";
      continue;
    }

    const compMatch = line.match(/^الكفاءة[:\s]+(.+)/);
    if (compMatch) { current.competency = compMatch[1].trim(); continue; }

    if (line.startsWith("التبرير")) continue;

    if (!current.answers.length) {
      current.question_text += " " + line;
    }
  }
  if (current && current.answers?.length) questions.push(current);
  return questions;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export async function handleImportDocxQuestions(req: Request, res: Response) {
  try {
    // Expect: multipart/form-data with field "file" (ArrayBuffer sent as base64)
    // OR: JSON body with { fileBase64: string, certType: string, examLanguage: string, difficulty: string }
    const { fileBase64, certType, examLanguage, difficulty } = req.body as {
      fileBase64: string;
      certType: "CP" | "SCP";
      examLanguage: "en" | "ar";
      difficulty: "easy" | "medium" | "hard";
    };

    if (!fileBase64 || !certType || !examLanguage) {
      return res.status(400).json({ error: "Missing required fields: fileBase64, certType, examLanguage" });
    }

    // Decode base64 → Buffer
    const buffer = Buffer.from(fileBase64, "base64");

    // Extract text using mammoth
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value;

    // Split into paragraphs
    const paragraphs = rawText
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    // Parse based on language
    const isArabic = examLanguage === "ar";
    const parsed = isArabic ? parseAR(paragraphs) : parseEN(paragraphs);

    if (parsed.length === 0) {
      return res.status(422).json({
        error: "No questions found in the document. Please check the file format.",
      });
    }

    // Map competencies
    const compMap = isArabic ? COMPETENCY_MAP_AR : COMPETENCY_MAP_EN;
    const mapped = parsed.map((q: any) => {
      const rawComp = q.competency || "";
      const dbCompName = compMap[rawComp] || rawComp;
      const isBehavioral = BEHAVIORAL_COMPETENCIES.has(dbCompName);

      return {
        question_text: q.question_text.trim(),
        answers: q.answers,
        correct_answer: q.correct_answer || "A",
        competency_name: dbCompName,
        competency_section: isBehavioral ? "behavioral" : "knowledge_based",
        bock_domain: isBehavioral ? "Behavioral" : "Knowledge",
        certification_type: certType,
        exam_language: examLanguage,
        difficulty: difficulty || "medium",
        unmapped: !compMap[rawComp],
        raw_competency: rawComp,
      };
    });

    const unmapped = mapped.filter((q: any) => q.unmapped).map((q: any) => q.raw_competency);
    const uniqueUnmapped = [...new Set(unmapped)];

    return res.json({
      questions: mapped,
      total: mapped.length,
      unmapped_competencies: uniqueUnmapped,
    });
  } catch (err: any) {
    console.error("DOCX import error:", err);
    return res.status(500).json({ error: err.message || "Failed to process DOCX file" });
  }
}
