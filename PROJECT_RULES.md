# PlateLine — PROJECT RULES (UPDATED v3)

Read carefully, then confirm you understand before doing anything. I am building "PlateLine", a privacy-first, local-first Android app for a hackathon. I have ZERO budget: no paid service, API, hosting, database, subscription, or billing may ever be enabled. If a free tier runs out, degrade gracefully — never fake functionality.

WHAT PLATELINE IS: a meal-and-glucose journal that puts home-cooked meals, glucose readings, and therapy (pill/insulin) timing on ONE timeline. This version ships WITHOUT any AI/ML model. AI controls in Settings are shown as unavailable (see Rule 14). Never fake analysis.

LOCKED STACK (do not change): Expo (React Native, JavaScript), expo-sqlite for local storage, expo-image-picker + expo-image-manipulator + expo-file-system for photos, Victory Native XL for charts, expo-print + expo-sharing for PDF reports, Git + private repo. (Cloudflare Worker + Gemini are NOT part of this version.)

## HARD RULES — a violation means the build failed:

1. All user data stays in on-device SQLite. No cloud database, no accounts, no sync.
2. Glucose values and history NEVER leave the device.
3. API keys exist ONLY in server-side environment variables, should AI ever return. Never in app code, never in the repo.
4. NOT A MEDICAL DEVICE. Never diagnose, never recommend insulin/medication/treatment, never predict glucose, never say a meal "caused" a reading. Only: "recorded near", "appeared after", "recorded X min after: [meal]".
5. If AI is ever re-enabled: nutrition values are MIN–MAX ranges labelled "AI estimate", user edits and explicitly Accepts. Track source per value: 'ai' | 'user' | 'demo'. NOT APPLICABLE in this version — see Rule 14.
6. Store timestamps as LOCAL date-time strings. No UTC conversion. Prove: save, reload, edit a non-time field, timestamp unchanged. **This applies to edits too: editing any field of an entry must NEVER change its original timestamp.**
7. One glucose unit throughout (default mg/dL, configurable, labelled everywhere).
8. Reading context is optional: Fasting / Before meal / After meal / Other / Prefer not to specify. Save null if unset; show "Context not specified". NEVER infer context.
9. Pattern cards appear ONLY with 3+ matching meal-reading pairs (readings 1–3h after a meal, keyword-normalized names). Every card MUST include verbatim: "These are recorded associations only. Many factors affect glucose, and this does not show that a meal caused a reading."
10. Footer everywhere: "PlateLine is a journaling tool, not a medical device."
11. Only fictional demo data, clearly labelled "Demo sample".
12. Work in SMALL verifiable steps. After each step, tell me exactly what you tested. Never claim something works without verifying.
13. Minimal diffs — do not rebuild working parts.
14. **AI IS DISABLED IN THIS VERSION.** The Settings "Photo meal analysis" toggle stays visible but disabled, with the line directly below it: "This option is not available in this version." If AI is unavailable, show "AI analysis unavailable" and keep manual entry working. NEVER fake analysis.
15. **Exactly 4 bottom tabs in this order: Home | Timeline | Add | Settings.** Swipe navigation via `react-native-pager-view` or equivalent. Report is a Home button opening a modal page, NOT a tab.
16. **Swipe left/right anywhere switches tabs** with a smooth slide; the bottom bar highlights follow the swipe.
17. **THEME — BOHEMIAN PALETTE (only colors allowed anywhere):**

    - Terracotta primary:        `#C1553B`
    - Deep rust (pressed/dark):  `#9E3D2A`
    - Ochre / mustard accent:    `#D9A441`
    - Cream background:          `#F6EFE3`
    - Sand card fill:            `#FBF6EA`
    - Warm ink (main text):      `#4E3728`
    - Muted taupe (captions):    `#8C7462`
    - Dusty rose (soft accent):  `#C98F7E`
    - Faded olive (secondary):   `#8A8B6C`
    - Deep plum (rare accent):   `#5A3E4E`
*NO pure black, NO default gray, NO default blue anywhere.*
**BOHEMIAN FEEL:** warm, earthy, hand-crafted. Rounded organic shapes (14–22px radius), layered soft cards like woven textiles, terracotta used sparingly for primary actions, ochre for highlights, generous whitespace, never cramped. Subtle warmth beats decoration.

18. **Background image:** ONE static locally bundled asset (offline, no network) in muted bohemian/earth tones — behind Home chart content only, under a warm ink overlay ~60% opacity for readability. Never behind form inputs.
19. **Add screen = tile grid of previous entries + one "+" tile.** "+" opens a NEW ENTRY page modally (Quick Reading / Meal Log cards) with a close (X) button and Android-back close. Tapping an entry tile opens a preview modal (details + editable notes).
20. **MEDICINE — STATUS + JOURNAL:**

    - The `readings` table gains a nullable `medicine_status` column: 'taken' | 'not_taken' | 'prefer_not_to_say'. Migrate safely: ALTER TABLE only if the column is missing; existing rows become 'prefer_not_to_say' at display time — never rewrite old rows.
    - The optional free-text `medicine` journal column stays (helper: "Journal only — PlateLine never suggests doses.").
    - **Medicine STATUS IS MANDATORY in the Quick Reading form:** three chips — "Taken" / "Not taken" / "Prefer not to say". The form cannot be saved until one is chosen; no silent default preselected. Free-text medicine name stays optional.

21. **Stat tiles show SIMPLE STATISTICS only,** always carrying verbatim: "Simple statistics — not medical advice."
22. **One milestone at a time;** user verifies on phone before continuing.
23. **Do not break verified M1–M5 behavior.** When changing visuals, minimal diff; when a change breaks a working feature, restore it first.

## NEW HARD RULES:

24. **SPLASH / STARTUP BRANDING:** The app startup must NEVER show the old logo or any default Expo asset. Splash = cream background (`#F6EFE3`) with ONLY the bohemian terracotta glyph (no text). No broken/half animations: either a single clean 400–600ms fade-in of the glyph, or a static splash — never a frozen animation frame.
25. **EDIT AND DELETE MUST ACTUALLY WORK:** Every entry (reading and meal) can be edited and deleted from its preview modal. Delete requires a confirmation dialog, then removes from SQLite and refreshes every screen that shows the entry (Add grid, Timeline, Home chart, stat tiles). Edits persist after app restart. **Verify before claiming done:** add → edit note → save → force-close → reopen → change is there; delete → force-close → reopen → entry is gone.
26. **EXPORT — SHARE SHEET, NO BROKEN BUTTONS:**

    - **PDF export:** tapping it generates the PDF, then opens the NATIVE ANDROID SHARE SHEET (expo-sharing / ACTION_SEND) so the user can send the file via Telegram, WhatsApp, Gmail, Drive, or any app that accepts files — exactly like normal Android sharing. Never a dead button, never an unhandled error.
    - **JSON backup:** either works the same way (generate → native share sheet) and is verified end-to-end, or is REMOVED from the UI. A button that errors is a build failure.

27. **CHART POINTS ENCODE THREE FACTORS, ALL VS TIME+DATE:** every plotted glucose point carries:
(a) its value and exact local date-time (x-axis),
(b) reading context — Fasting / Before meal / After meal / Other / "not specified" — shown via marker color/shape,
(c) medicine status — Taken / Not taken / Prefer not to say — shown via a distinct marker attribute (e.g. fill vs outline, or a small badge/dot).
A legend on the chart explains every marker meaning. Markers must stay distinguishable on the darkened background image (ochre line, high-contrast markers, verify visually).
28. **MULTIPLE CHART VIEWS:** the Home chart offers a view switcher (segmented control) with at least:

    - **Line** (default): every reading over time, markers per Rule 27.
    - **Daily average**: one bar per day (average glucose that day), empty days skipped.
    - Switching views recomputes from the same 7/14/30-day selector. Views must be readable on the background image.

29. **TAP A CHART POINT → FULL PREVIEW:** tapping any plotted point (line view) opens the SAME preview modal used in Add/Timeline showing everything: value + unit, exact date & time, context, medicine status + journal text, note, and edit/delete actions. Reuse the shared component — never duplicate.
30. **CHART DATA HONESTY:** stat tiles, bars, and previews all read from the same SQLite query per selected period. If there are no readings in the period, the chart area shows a friendly empty state ("No readings in this period") — never a broken or empty-looking chart.
