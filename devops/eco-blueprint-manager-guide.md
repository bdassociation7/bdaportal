# ECO Blueprint Manager — User Guide

## What is this page?

Every BDA certification exam (BDA-CP and BDA-SCP) has **120 questions**.

Right now, every candidate gets the **exact same 120 questions in the exact same order** — every single time. This is a problem:
- Candidates who retake the exam already know the questions
- There is no real randomization

The **ECO Blueprint** is the solution. It defines:
> *"For this certification, how many questions should be drawn from each competency per exam attempt?"*

Once configured, every new exam attempt will **randomly draw** the exact number of questions you define per competency — different each time, always balanced according to your blueprint.

---

## The page layout

The page has two tabs: **BDA-CP** and **BDA-SCP**.
Each tab shows the same structure — one table for Behavioral competencies, one for Knowledge competencies.

---

## The columns explained

### Competency
The name of the competency (e.g. "Strategic Leadership", "Growth & Expansion Strategies"). There are 14 total — 7 Behavioral + 7 Knowledge.

---

### Pool EN
How many questions currently exist in the **English question bank** for this competency.

> Example: "Consultative Mindset → Pool EN = 6" means we only have 6 English questions tagged to that competency.

⚠️ **Numbers shown in orange** = the pool is small (below 8). You cannot draw more questions than what exists in the pool.

---

### Pool AR
Same thing, for the **Arabic question bank**.

> If Pool AR shows "—", it means we have no Arabic questions tagged to that competency yet.

---

### Draw Count
**This is the only field you need to fill in.**

It is how many questions will be randomly drawn from this competency for each exam attempt.

> Example: if you set "Strategic Leadership → Draw Count = 8", every candidate will get exactly 8 random Strategic Leadership questions — but not necessarily the same 8.

**Rules:**
- Draw Count must be **≤ Pool EN** (you can't draw 8 questions if only 6 exist)
- Draw Count must be **≤ Pool AR** (same rule for Arabic exams)
- The **grand total of all Draw Counts must equal exactly 120**

---

### Status
Shows whether your Draw Count value is valid for that row.

| Icon/Text | Meaning |
|-----------|---------|
| ✅ (green circle) | Valid — draw count is within pool limits |
| ⚠️ Exceeds EN pool | You entered more than the number of English questions available |
| ⚠️ Exceeds AR pool | You entered more than the number of Arabic questions available |
| ⚠️ Exceeds EN & AR | Exceeds both pools |
| — | Not configured yet (Draw Count = 0) |

---

## The top bar

### Total counter
Shows the **running sum** of all your Draw Counts.

> Example: `Total: 11 / 120` → you've configured 11 questions so far, 109 still to assign.

- 🔴 Red = total is not 120 yet → Save is blocked
- 🟢 Green = total equals exactly 120 → Save is enabled

### "109 short" badge
Tells you exactly how many more questions you still need to assign across the competencies.

### Error alert (red box)
`"Total must equal exactly 120 questions. Current total: 11."`
This means the Save button is disabled until you reach exactly 120. It disappears automatically once you hit 120.

---

## The buttons

### Reset
Cancels all unsaved changes and goes back to the last saved state. Use this if you made a mistake and want to start over.

### Save Blueprint
Saves your configuration to the database. **Only becomes active when total = 120 and no competency exceeds its pool.**

Once saved, new exam attempts will use this blueprint to randomly draw questions.

---

## Step-by-step: how to configure the blueprint

1. Open the **BDA-CP** tab
2. Look at the **Pool EN** and **Pool AR** columns to understand how many questions are available per competency
3. Fill in the **Draw Count** column for each of the 14 competencies
4. Watch the **Total** counter at the top — keep adding until you reach exactly **120**
5. Make sure no row shows a warning in the Status column
6. Click **Save Blueprint**
7. Repeat for the **BDA-SCP** tab

---

## Example: a valid BDA-CP configuration

| Domain | Competency | Pool EN | Pool AR | Draw Count |
|--------|-----------|---------|---------|------------|
| Behavioral | Strategic Leadership | 8 | 8 | 8 |
| Behavioral | Effective Communication | 11 | 10 | 8 |
| Behavioral | Business Acumen | 7 | 8 | 7 |
| Behavioral | Emotional Intelligence (EQ) | 7 | 7 | 7 |
| Behavioral | Critical Thinking & Problem Solving | 7 | 8 | 7 |
| Behavioral | Consultative Mindset | 6 | 7 | 6 |
| Behavioral | Negotiation & Relationship Management | 7 | 7 | 7 |
| **Behavioral subtotal** | | | | **50** |
| Knowledge | Growth & Expansion Strategies | 12 | 12 | 10 |
| Knowledge | Market & Competitive Analysis | 11 | 11 | 9 |
| Knowledge | Innovation in Business Development | 8 | 8 | 8 |
| Knowledge | Business Project Management | 10 | 10 | 8 |
| Knowledge | Financial & Pricing Models | 10 | 10 | 8 |
| Knowledge | Marketing & Sales Strategies | 10 | 10 | 9 |
| Knowledge | Legal & Compliance in Business Development | 5 | 6 | 5 |
| **Knowledge subtotal** | | | | **57** |
| | | | | **⚠️ Total = 107 — not valid yet** |

> This example is just to illustrate — you define the actual numbers based on your ECO document. The total must reach exactly 120.

---

## Important constraints to keep in mind

| Constraint | Why |
|-----------|-----|
| Draw Count ≤ Pool EN | You can't draw questions that don't exist in the English bank |
| Draw Count ≤ Pool AR | Same for the Arabic bank — both languages must be satisfiable |
| Total must = 120 | Every exam attempt must have exactly 120 questions |
| Legal & Compliance EN pool = 5 | This is the smallest pool — you cannot assign more than 5 for this competency unless more questions are added |

---

## Frequently asked questions

**Q: Does this affect exams already in progress or already completed?**
No. Only new exam attempts (started after Save) will use the blueprint. Past attempts are not affected.

**Q: Can I change the blueprint after saving?**
Yes, at any time. Just update the Draw Counts and hit Save again. It applies to the next attempt created from that point.

**Q: What if I don't configure the blueprint?**
The system falls back to the current behavior: all 120 questions in fixed order, same for everyone.

**Q: What if a competency pool is too small?**
You would need to add more questions to that competency in the question bank first, then come back and configure the blueprint.

**Q: Can I configure CP and SCP differently?**
Yes. Each tab (BDA-CP / BDA-SCP) is independent.
