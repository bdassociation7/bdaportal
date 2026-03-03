# Daniel Holmes-Banks — Exam Report

## Candidate Info
- **Name**: Daniel Holmes-Banks
- **Email**: danielholmesbanks@gmail.com
- **Exam**: BDA Certified Professional (BDA-CP) — English
- **Confirmation Code**: BDA-MM6ZPOEG-AUFB

## Exam Timeline

| Event | Time (UTC) | Time (Sydney) |
|-------|-----------|---------------|
| Exam scheduled | 2026-03-03 01:00:00 | 12:00 PM AEDT |
| Exam started | 2026-03-03 00:47:54 | 11:47 AM AEDT |
| Exam completed | 2026-03-03 02:58:23 | 01:58 PM AEDT |
| **Duration** | **2h 10m** | |

## Result

| Metric | Value |
|--------|-------|
| Questions answered | 120 / 120 |
| Correct answers | 2 |
| Score | 2% |
| Status | **Failed** |

## Investigation

We analyzed Daniel's answers and found a consistent pattern across **all 120 questions**:

- Daniel always selected **2 answers** per question
- In almost every case, **one of his two selections was the correct answer**
- The grading system expects an **exact match** — selecting an extra answer makes it wrong

### Example (10 questions sample)

| Question | Daniel Selected | Correct Answer | Had Correct? |
|----------|----------------|----------------|-------------|
| Q1 | `665e...`, `c6a9...` | `665e...` | Yes |
| Q2 | `7e55...`, `59e0...` | `7e55...` | Yes |
| Q3 | `22ff...`, `9054...` | `22ff...` | Yes |
| Q4 | `e797...`, `74b6...` | `e797...` | Yes |
| Q5 | `d143...`, `d368...` | `d368...` | Yes |
| Q6 | `a47a...`, `6de3...` | `a47a...` | Yes |
| Q7 | `6cc4...`, `bef3...` | `6cc4...` | Yes |
| Q8 | `fe9b...`, `4ec2...` | `4ec2...` | Yes |
| Q9 | `7dbe...`, `58cb...` | `7dbe...` | Yes |
| Q10 | `8894...`, `a8fb...` | `8894...` | Yes |

**In all 10 sampled questions, Daniel's selection contained the correct answer.**

## Root Cause

All 120 questions in the BDA-CP exam are configured as `multiple_choice` (question_type = 'multiple_choice'). However, each question has **only 1 correct answer**.

This creates a misleading situation:

1. The candidate sees a multi-select interface (checkboxes instead of radio buttons)
2. This implies that multiple answers are expected
3. Daniel consistently selected 2 answers, likely believing the question required more than one
4. The grading system checks for an exact match — any extra selection means wrong

**Note:** The system does not force candidates to select multiple answers. Daniel could have selected only 1. However, presenting single-answer questions as multi-select is misleading and does not reflect standard exam UX practices.

## Recommendation

### Short-term — Daniel's case
Two options to discuss:

1. **Re-grade his attempt** with partial credit logic: if the correct answer is within his selections, count it as correct. This would give a fairer score reflecting his actual knowledge.
2. **Reset his voucher** and allow him to retake the exam, now that he understands the format.

### Long-term — Fix the question configuration
- Questions with only 1 correct answer should be set to `single_choice` — this renders radio buttons (one selection only) instead of checkboxes
- If a question genuinely has multiple correct answers, keep it as `multiple_choice` and clearly indicate "Select all that apply" in the UI
- Consider adding a label on multi-select questions: *"Select X answers"* to set expectations

### Query to identify affected questions
```sql
-- Find all "multiple_choice" questions that have only 1 correct answer
SELECT q.id, q.question_text, q.question_type, COUNT(a.id) as correct_count
FROM quiz_questions q
JOIN quiz_answers a ON a.question_id = q.id AND a.is_correct = true
WHERE q.question_type = 'multiple_choice'
GROUP BY q.id, q.question_text, q.question_type
HAVING COUNT(a.id) = 1;
```

This will list all questions that should be changed from `multiple_choice` to `single_choice`.
