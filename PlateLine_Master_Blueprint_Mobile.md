# PLATELINE — MASTER BLUEPRINT (Mobile Application Edition)
**Document ID:** PL-BP-M1 | **Core Philosophy:** Radical Human Agency Through Awareness
**Architecture:** 100% Local-First, Offline-First, Zero-Cost | **Platform:** Mobile App (Android-first, iOS-ready)

---

## 0. Why Mobile App Instead of Web App — The Strategic Pivot

The original PlateLine was designed as a browser web app using IndexedDB. This blueprint upgrades it to a **native mobile application** because the phone is where the user's health actually happens — at the dining table, at the glucometer, at the doctor's clinic. The pivot is not cosmetic; it delivers four structural advantages:

| Leverage | Web App (IndexedDB) | Mobile App (Native) | Why It Matters |
|:---|:---|:---|:---|
| **Data durability** | Browser cache can be silently cleared by the OS, the browser, or "cleaner" apps; records vanish without warning. | SQLite database lives in the app's private sandbox. Only the user (via explicit "Delete all my data" with typed confirmation) or an app uninstall can remove it. | For a medical journal, *durability of records* is a feature, not a detail. |
| **Capture quality** | File-input photos, often downscaled by the browser before the app even sees them. | Native camera with full resolution control; on-device downscale to 1280px gives the AI the best possible image. | Better input = better AI drafts = better food recognition for home-cooked meals. |
| **True offline** | A web app still needs a server for delivery; the original design assumed a laptop running a local Node proxy. A phone cannot run a localhost proxy. | The app is fully self-contained on-device. The only network touchpoint is the optional AI call through a free serverless proxy. | Works in areas with poor connectivity — exactly where the target user lives. |
| **Distribution & trust** | A URL with no presence. | App store listing = discoverability, credibility, and a permanent home on the user's most personal device. | Zero-cost distribution via Google Play; App Store later. |
| **Cost to user** | None, but fragile. | None. No accounts, no subscriptions, no cloud database, no paid services — **ever**. | The user never pays money *or* data. |

**Decision:** Build with **Expo (React Native)** — it reuses the team's existing React/Vite knowledge, compiles to real native apps, keeps the entire stack free, and is the fastest path from zero to an installable APK within a hackathon-grade timeline.

---

## 1. THE PROBLEM — Clearly Articulated

India carries **~89.8–90 million adults with diabetes (2nd globally, ICMR-INDIAB / IDF Diabetes Atlas)**, with national adult prevalence near **~10.5%** (urban ~11.2%). The vast majority (**~95–98%**) have **Type 2 diabetes**, where structured dietary intervention and caloric management are clinically proven — via landmark trials such as **DiRECT (The Lancet)** and **Look AHEAD** — to reduce ectopic fat around the pancreas and liver and drive the condition into clinical remission (HbA1c < 6.5% without glucose-lowering medication for 3+ months).

Yet the people who could benefit most are failing to keep usable records, for five concrete reasons:

1. **Paper and memory fail at the exact moment of need.** A person who checks glucose after lunch cannot remember — three days later, in a 10-minute doctor consultation — what they ate, how much, or when they took their tablet.
2. **Existing apps recognize barcodes, not *dal*.** mySugr, Glooko and similar tools are optimized for Western packaged foods and restaurant chains. They fail on unstructured, multi-ingredient, home-cooked Indian meals — which is what the target user actually eats.
3. **Existing apps demand accounts and ship data to corporate clouds.** Health histories sit on external servers the user never chose, often behind paywalls.
4. **Existing apps over-claim.** They present AI nutrition as precise fact and imply "this meal caused your spike" — medically unsupportable and actively harmful framing.
5. **Therapy timing is invisible.** When a pill or insulin dose was taken relative to a meal is the single most context-rich signal a clinician wants — and no consumer app captures it next to the meal.

**The problem, in one line:** *People managing Type 2 diabetes with home-cooked meals cannot connect what they ate, when they medicated, and what their glucose did — in a form their doctor can actually use — without surrendering their privacy or their money.*

---

## 2. TARGET USER — Defined and Specific

**Primary persona — "The Hand-Logger":**
- An adult (35–65) with Type 2 diabetes, or a caregiver managing it for a parent.
- Currently records glucose in a paper notebook or a WhatsApp message to themselves.
- Eats predominantly home-cooked, multi-ingredient meals (roti, dal, sabzi, rice) that barcode-based apps cannot identify.
- Visits a doctor or dietitian every few weeks with nothing structured to show.
- Owns a mid-range Android phone; may have intermittent data connectivity; is cost-sensitive and privacy-conscious.

**Secondary personas:**
- A newly diagnosed patient building awareness habits before clinical intervention.
- A caregiver (adult child) who helps a parent maintain a clean record for consultations.

**Explicit non-users (scope discipline):** Type 1 patients needing insulin-dose calculation (PlateLine never recommends doses), and anyone seeking diagnosis — PlateLine is a journal, not a medical device.

---

## 3. MEANINGFUL INNOVATION — What Makes It Different

PlateLine competes on five dimensions, each a deliberate inversion of the market's assumptions:

| Dimension | Market Apps (mySugr / Glooko) | PlateLine Innovation |
|:---|:---|:---|
| **Data ownership** | Cloud-synced corporate silos, user accounts, health history on remote servers. | **100% Local-First:** all records and photos in on-device SQLite. Zero accounts. Zero cloud database. Exportable JSON at any time. |
| **AI philosophy** | Automated AI output treated as precise nutritional truth. | **The "Draft-Maker" Model:** AI proposes food items and **min–max nutrition ranges**; the user *must* review, correct, and explicitly Accept. The correction UX is the innovation — the human stays the author of their own record. |
| **Food recognition** | Barcodes, packaged Western foods, restaurant chains. | **Home-Cooked Meal Focus:** vision AI + free-text correction built for unstructured traditional recipes. |
| **Causation vs. association** | "This meal caused your spike." | **Strict Cautious Boundaries:** neutral wording only — "recorded 95 min after: Dal and rice". Pattern cards state plainly: *"These are recorded associations only. Many factors affect glucose, and this does not show that a meal caused a reading."* |
| **Therapy context** | Medication tracking in a disconnected module. | **Integrated Therapy Timing:** pill/insulin timing logged alongside the meal, so metabolic shifts have their real-world context on one timeline. |

**The differentiating insight in one sentence:** *Every competitor automates the user into a data source; PlateLine arms the user with awareness — AI drafts, the human decides.*

---

## 4. TECHNICAL EXECUTION — Complete Architecture

### 4.1 Zero-Cost Stack (locked)

| Layer | Choice | Cost | Rationale |
|:---|:---|:---|:---|
| Framework | **Expo (React Native, JavaScript)** | Free | Reuses React skills; compiles to real Android APK / iOS build; OTA updates possible later |
| Local database | **expo-sqlite (SQLite)** | Free | Durable, transactional, private app-sandbox storage — the mobile upgrade from IndexedDB |
| Photos | **expo-image-picker + expo-image-manipulator + expo-file-system** | Free | Native camera access; on-device downscale to max 1280px; stored in app documents |
| Charts | **Victory Native XL** (react-native-svg) | Free | Glucose line with meal markers, target-range band |
| Report | **expo-print + expo-sharing** | Free | A4 PDF rendered on-device; share via WhatsApp/email/print — how Indian patients actually send records to doctors |
| Localization | **expo-localization + i18n-js** | Free | Future Hindi/regional dialect support |
| AI proxy | **Cloudflare Workers (free tier)** — one serverless function | Free | The critical adaptation: a phone cannot run a localhost Node proxy. One Worker holds the Gemini key server-side, rate-limits, validates, forwards *image only*. Self-hostable for the privacy-maximal user. |
| AI | **Gemini Vision API (free tier only, if eligible)** | Free | Optional Draft-Maker; never required to log anything |
| Version control | Git + private repo | Free | — |

**Hard architecture rules (non-negotiable):**
- Glucose values **never** leave the device. The proxy receives **only a meal photo**, and only after explicit user consent.
- API key lives **only** in the Worker's server-side environment variable. Never in app code, never in the repo.
- If the network, the proxy, or the AI fails: logging, timeline, chart, report, and manual meal entry continue with **zero degradation**.
- Never enable billing on any service. If quota is exhausted → show "AI analysis unavailable" and keep manual entry. Never fake analysis.

### 4.2 System Architecture

```
┌──────────────────────────── PHONE (all user data lives here) ────────────────────────────┐
│                                                                                           │
│   UI LAYER:  Timeline | Add (Quick Reading / Meal Log) | Chart | Patterns | Report | Settings│
│        │                                                                                  │
│   APP LOGIC: validation | local-time handling (no UTC shifts) | meal–reading pairing     │
│        │                    | cautious pattern rules (3+ pairs, 1–3h window)             │
│        ├───────────────────────────────┬──────────────────────────────────┐             │
│   SQLite (expo-sqlite)          File System                  Output                       │
│   readings, meals,              photos (1280px               Victory Native chart          │
│   analyses, settings            max, app sandbox)            expo-print A4 PDF            │
│                                                              JSON export/import           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
                    │  1. photo ONLY (jpeg/png/webp, ≤4MB) + consent flag
                    ▼
        ┌───────────────────────┐         ┌─────────────────────────┐
        │ CLOUDFLARE WORKER     │  2. img │ GEMINI VISION API       │
        │ POST /analyse-meal    │────────▶│ (free tier, if eligible)│
        │ type/size check       │         │ fixed prompt → JSON     │
        │ rate limit, CORS      │◀────────│ items + nutrition       │
        │ key in env only       │ 3.      │ min-max ranges          │
        └───────────────────────┘ validated JSON
```

### 4.3 Data Model (SQLite tables)

| Table | Fields |
|:---|:---|
| `readings` | id, value, unit, recordedAt (local date-time string — never UTC-converted), context (nullable: Fasting / Before meal / After meal / Other / Prefer not to specify), notes, createdAt, updatedAt |
| `meals` | id, recordedAt, description, photoPath (nullable), nutrition {calories, carbs, protein, fat, fibre} each {min, max, source: 'ai'\|'user'\|'demo'}, therapyNotes (pill/insulin timing, free text, optional), analysisStatus, createdAt, updatedAt |
| `photos` | key, filePath, blob (downscaled ≤1280px) |
| `analyses` | id, mealId, items [{name, portion, confidence}], uncertaintyNotes, model, analysedAt, acceptedByUser |
| `settings` | key, value (unit [default mg/dL], targetRange, aiConsentGiven, language) |

**Data rules:** one glucose unit throughout, configurable, labelled everywhere; per-value source tracking ('ai' vs 'user' vs 'demo'); timestamps stored as local strings with an edit+reload stability test.

### 4.4 Core Modules → Screens

1. **Dual Entry (< 20 seconds):** *Quick Reading* (value required, sane-range validation, local date/time pre-filled and editable, optional context, optional notes) and *Meal Log* (description, optional photo, optional manual nutrition, optional therapy timing).
2. **Draft-Maker AI Review Pipeline:** photo → consent (first use) → Worker → Gemini → editable review card: rename items, adjust portions, add missing foods, remove false detections, nutrition shown as **min–max ranges labelled "AI estimate"**, uncertainty notes, **Accept / Edit / Discard**. Nothing persists until Accept.
3. **Unified Proximity Timeline:** meals and readings side-by-side by day, each reading showing the neutral line *"Recorded 95 min after: Dal and rice"* when a meal exists within the prior 4 hours. Never causal wording.
4. **Cautious Pattern Cards:** appear only with **3+ matching pairs** (keyword-normalized meal names, readings 1–3 h after). Always show the not-causation disclaimer. Otherwise: *"Not enough data yet (need 3+ matching entries)."*
5. **Chart:** glucose line over 7/14/30 days, target-range band, meal markers with description tooltips, honest handling of gaps and single points.
6. **Report & Portability:** date-range summary (counts, min/max/average — labelled simple statistics), chart, chronological tables, disclaimer footer; rendered via expo-print to A4 PDF and shared via the OS share sheet; full JSON export/import round-trip.
7. **Settings & Privacy:** unit, target range, AI consent toggle, plain-language privacy section, backup reminder, **Delete all my data** with typed confirmation; first-run welcome with disclaimer.

---

## 5. FUNCTIONAL PROTOTYPE — Demonstrable Proof of Concept

**Build sequence (20-hour plan, buffer rule applies):**

| Hours | Block | Done when |
|:---|:---|:---|
| 0–1 | Expo scaffold, app shell, bottom nav (Timeline / Add / Chart / Report / Settings), persistent footer "PlateLine is a journaling tool, not a medical device." | All five screens render, no console errors |
| 1–3 | SQLite layer (expo-sqlite), schema, CRUD, local-time utilities; edit+reload timestamp stability test | Records persist across reinstall-free reloads; timestamps stable |
| 3–5 | Entry forms: Quick Reading + Meal Log (manual nutrition, photo pick + 1280px downscale) | Create/edit/delete verified with and without photo |
| 5–8 | Unified Timeline + Chart with fictional data | Meal gaps and markers render; no causal wording anywhere |
| 8–12 | Cloudflare Worker proxy + Analyse Meal UI with consent, 20s timeout, review/accept flow, graceful failure | Real photo yields editable ranges; server offline → manual entry unaffected |
| 12–14 | Cautious Pattern Cards | Appear only at 3+ pairs; disclaimer always present |
| 14–16 | Report (expo-print PDF) + JSON export/import | PDF shares cleanly; round-trip restores identical records |
| 16–17 | Settings, privacy, consent, Delete-all | Privacy checklist passes |
| 17–19 | Demo data (clearly fictional, "Demo sample" labels), QA pass (mobile 375px logic + Android device) | Full test checklist passes |
| 19–20 | README, EAS build to APK, pitch rehearsal | Demo runs twice without errors |

**Buffer rule:** if >2 hours behind at hour 12, cut Pattern Cards; protect the core loop.

**Demo script (3 minutes):** Problem (20s) → Quick Reading live (20s) → meal photo → consent → AI draft → correct one item → accept (60s) → Timeline with time gaps (30s) → Pattern card with not-causation wording (15s) → PDF report share + "data never left this phone" (25s) → close: *"AI assists; the user stays in control."*

---

## 6. CREDIBLE USE CASE — A Day With PlateLine

**Mrs. Sharma, 54, Type 2, Pune.** Morning fasting reading: 132 mg/dL — logged in 12 seconds with context "Fasting". Lunch: two rotis, dal, bhindi — she photographs the plate, consents, and the AI drafts items with ranges ("Dal, 1 bowl — carbs 18–26 g"). She corrects the dal portion to 1.5 bowls and accepts; the record is tagged 'user-edited from AI estimate'. She logs "Metformin taken 10 min before lunch" in therapy notes. Post-lunch reading at +95 min: 168 mg/dL — the timeline links it neutrally: *"Recorded 95 min after: Roti, dal, bhindi."*

Over three weeks, her roti-dal lunches accumulate 5 qualifying pairs; a pattern card appears showing the recorded range — with its explicit not-causation line. At her endocrinologist visit she opens the Report page, exports the 30-day PDF over WhatsApp, and the doctor sees timed meals, therapy notes, and readings on one page — the first time Mrs. Sharma has arrived with usable data. *The clinician makes every decision; PlateLine made the decision possible.*

**Value evidence over alternatives (for judges):**
- vs. **paper:** searchable, never lost, computable time gaps, clinician-ready export.
- vs. **mySugr/Glooko:** home-cooked meal recognition, therapy timing integrated, zero subscription, zero cloud dependency, honest association-only insights.
- vs. **AI-only nutrition apps:** Draft-Maker + mandatory human correction beats blind automation on trust *and* on data quality — every accepted estimate is user-verified.

---

## 7. SECURITY, PRIVACY, ETHICS & SAFETY

- **Security:** data encrypted at rest by the OS app sandbox; no accounts → no credential attack surface; API key server-side only; no secrets in repo or app bundle (verify by searching the bundle).
- **Privacy:** consent dialog before first image upload, withdrawable in Settings; only the photo is sent, explained in plain language; glucose data never transmitted; IndexedDB-grade localness replaced with *durable* SQLite privacy.
- **Ethics:** no dark patterns, no paywalling the user's own data, no engagement-maximizing notifications; data portability is a first-class feature.
- **Safety (hard boundaries):** PlateLine is **not a medical device**. It does not diagnose, does not predict glucose from photos, does not recommend insulin/medication/treatment, and never claims a meal caused a reading. Pattern cards require 3+ pairs and carry the disclaimer. AI estimates are always ranges, always labelled, always user-confirmed. Fictional data only in demos. These boundaries are stated in-app on first run and on every report footer.

---

## 8. FUTURE DEVELOPMENT & REAL-WORLD DEPLOYMENT

- **Phase 2:** Continuous Glucose Monitor (CGM) CSV import; Hindi + regional-dialect localization; community-verified traditional recipe nutrition database (crowd-sourced, user-corrected — extending the Draft-Maker ethic).
- **Phase 3:** clinician-side read-only review link (patient explicitly exports), optional end-to-end encrypted backup the user fully controls.
- **Deployment path:** Google Play (Android-first, matching the user base), App Store later; the Cloudflare Worker free tier scales far beyond a hackathon's needs; self-hosting guide for privacy-maximal users.

---

## 9. JUDGING CRITERIA — Self-Assessment Map

| Criterion | Where it is addressed |
|:---|:---|
| Clearly articulated problem | §1 — with epidemiological evidence (ICMR-INDIAB, IDF, DiRECT/Look AHEAD) |
| Defined target user | §2 — "The Hand-Logger" persona + explicit non-users |
| Meaningful innovation | §3 — five-dimension differentiation, Draft-Maker model |
| Technical execution | §4 — locked stack, architecture, data model, offline resilience |
| Functional prototype / POC | §5 — 20-hour build plan + 3-minute demo script |
| Credible use case | §6 — Mrs. Sharma end-to-end scenario |
| Value over existing alternatives | §3 and §6 — explicit comparison table |
| Security, privacy, ethics, safety | §7 — plus in-app disclaimers and report footers |
| Potential for further development | §8 — phased roadmap and store deployment |

**Closing answer to "why is this meaningfully better?":** *Because it refuses the trade-off everyone else accepts. PlateLine gives the user corporate-grade tooling without the corporation: their data stays in their pocket, their home cooking is finally legible to software, their doctor finally gets usable records, and the AI — like a good assistant — drafts, but never decides.*
