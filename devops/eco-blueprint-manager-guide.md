# ECO Blueprint Manager — User Guide

## What is this page?

Every BDA certification exam (BDA-CP and BDA-SCP) has **120 questions**.

Without the blueprint, every candidate gets the **exact same 120 questions in the exact same order** — every single time:
- Candidates who retake the exam already know the questions
- There is no real randomization

The **ECO Blueprint** is the solution. It defines:
> *"For this certification, how many questions should be drawn from each competency per exam attempt?"*

Once configured, every new exam attempt will **randomly draw** the exact number of questions you define per competency — different each time, always balanced according to your blueprint.

---

## Page layout

The page has two tabs: **BDA-CP** and **BDA-SCP**.
Each tab is independent and shows the same structure — one table for Behavioral competencies, one for Knowledge competencies.

The top bar contains five buttons:

| Button | Purpose |
|--------|---------|
| **Simulate Draw** | Verify the saved blueprint against both EN and AR banks — no attempt created |
| **Test EN** | Open a real English exam attempt under your account to inspect the drawn questions |
| **Test AR** | Same for the Arabic exam |
| **Reset** | Cancel unsaved changes and restore the last saved values |
| **Save Blueprint** | Save your configuration — only active when total = 120 and no errors |

> **Simulate Draw**, **Test EN**, and **Test AR** are only enabled after a blueprint has been saved.

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

## Untagged questions warning

If any questions in the question bank have no competency assigned, an **amber warning** appears below the error alert:

> **Untagged questions detected:** EN bank: **1** question missing a competency. These questions will not be drawn by the blueprint engine. Assign them a competency in the question bank to include them.

This warning is informational — it does not block saving. However, untagged questions will be silently excluded from every exam attempt. Go to the question bank, find the untagged question(s), and assign the correct competency.

---

## Testing your blueprint

After saving a blueprint, two testing tools are available.

### Simulate Draw (read-only)

Click **Simulate Draw** to instantly verify whether the blueprint can be satisfied by the question banks — no attempt is created, nothing is written.

A modal opens with a table showing for each competency:

| Column | Meaning |
|--------|---------|
| Req. | How many questions you configured to draw |
| Pool EN | How many English questions exist for this competency |
| Drawn EN | How many would actually be drawn from the English bank (= min of Req. and Pool EN) |
| Pool AR | How many Arabic questions exist |
| Drawn AR | How many would actually be drawn from the Arabic bank |
| Status | ✅ if both Drawn EN and Drawn AR equal Req. — otherwise shows exact shortfall (e.g. "EN −2") |

At the top of the modal, two summary badges show the overall EN and AR totals:
- 🟢 `EN: 120 / 120` → the English exam will work correctly
- 🟢 `AR: 120 / 120` → the Arabic exam will work correctly
- 🔴 `AR: 118 / 120` → the Arabic bank cannot satisfy the blueprint — you must reduce draw counts or add more Arabic questions

Use Simulate Draw **before testing a real attempt** to catch any shortfalls without creating any data.

---

### Test EN / Test AR (live exam)

Click **Test EN** or **Test AR** to open a real exam attempt under your admin account, using the English or Arabic question bank respectively.

A confirmation prompt appears before anything is created:
> *"This will create a real exam attempt under your account (BDA-CP EN). The attempt will appear in your quiz history. You can abandon it at any time. Continue?"*

Once confirmed:
- A real attempt is created using your blueprint
- The exam timer starts immediately
- You land on the full exam page — identical to what a candidate sees
- Questions are randomly drawn exactly as the blueprint defines

**This is the most complete test** — you can verify that:
- The right number of questions per competency was drawn
- Questions are in random order, not fixed
- The timer works correctly
- The exam UI is functioning properly

#### Admin Test Mode banner

At the top of the exam page, an **amber banner** is always visible when you are an admin:

> 🧪 **Admin Test Mode** — This attempt is for testing only. Discard it when done to keep the database clean. `[Discard & Exit]`

Click **Discard & Exit** to:
1. Permanently delete the attempt and all its data from the database
2. Return you to the ECO Blueprint Manager

You can discard at any point — whether you have answered 0 questions or 100. Once you discard, the attempt is gone with no trace.

> ⚠️ You cannot discard an attempt that has already been submitted (completed). Do not click Submit Exam during a test — use Discard & Exit instead.

---

## Step-by-step: how to configure and validate the blueprint

1. Open the **BDA-CP** tab
2. Look at the **Pool EN** and **Pool AR** columns to understand how many questions are available per competency
3. Fill in the **Draw Count** column for each of the 14 competencies
4. Watch the **Total** counter at the top — keep adding until you reach exactly **120**
5. Make sure no row shows a warning in the Status column
6. If an untagged questions warning appears, note the count and plan to tag those questions in the question bank
7. Click **Save Blueprint**
8. Click **Simulate Draw** — confirm both EN and AR badges are green
9. Click **Test EN** — verify the drawn questions in the real exam UI, then click **Discard & Exit**
10. Click **Test AR** — same verification for the Arabic bank, then **Discard & Exit**
11. Repeat steps 1–10 for the **BDA-SCP** tab

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
| Untagged questions are excluded | Questions without a competency are invisible to the blueprint engine |

---

## Frequently asked questions

**Q: Does this affect exams already in progress or already completed?**
No. Only new exam attempts (started after Save) will use the blueprint. Past attempts are not affected.

**Q: Can I change the blueprint after saving?**
Yes, at any time. Just update the Draw Counts and hit Save again. It applies to the next attempt created from that point.

**Q: What if I don't configure the blueprint?**
The system falls back to the previous behavior: all 120 questions in fixed order, same for everyone.

**Q: What if a competency pool is too small?**
You would need to add more questions to that competency in the question bank first, then come back and configure the blueprint.

**Q: Can I configure CP and SCP differently?**
Yes. Each tab (BDA-CP / BDA-SCP) is independent.

**Q: What happens to my test attempt if I just navigate away without discarding?**
The attempt stays in the database in an incomplete state. It will not affect any reports or certifications, but it creates unnecessary data. Always use **Discard & Exit** to clean up after testing.

**Q: Can I run the simulation before saving?**
No. Simulate Draw uses the saved blueprint from the database. You must save first, then simulate.

**Q: Will two candidates taking the exam at the same time get different questions?**
Yes. Each exam attempt draws its own independent random selection. Two candidates starting at the same second will likely get different questions within each competency.
