# PlateLine

> Privacy-first, local-first Android meal-and-glucose journal connecting home-cooked meals, glucose readings, and therapy timing on ONE chronological timeline.

---

## What PlateLine Is
A meal-and-glucose journal that puts home-cooked meals, glucose readings, and therapy (pill/insulin) timing on ONE timeline. Optional AI meal-photo analysis is a **"Draft-Maker"**: it proposes foods and nutrition MIN–MAX ranges; the user reviews, corrects, and must explicitly Accept. AI is never required to log anything.

## Target User
Adults (35–65) with Type 2 diabetes (or their caregivers) who currently log readings in a notebook, eat predominantly home-cooked multi-ingredient meals that barcode apps fail on, own a mid-range Android phone, and are cost-sensitive and privacy-conscious.

## Locked Stack
- **Framework:** Expo (React Native, JavaScript)
- **Local DB:** expo-sqlite (SQLite) — all user data lives here, in the app sandbox
- **Photos:** expo-image-picker, expo-image-manipulator, expo-file-system
- **Charts:** Victory Native XL (react-native-svg)
- **Report:** expo-print + expo-sharing (on-device A4 PDF)
- **AI Proxy:** Cloudflare Workers (free tier, key in Worker env var ONLY)
- **AI:** Gemini Vision API (free tier only, optional Draft-Maker)

## Core Hard Rules
1. All user data stays in on-device SQLite. No cloud database, no accounts, no sync.
2. Glucose values and history NEVER leave the device.
3. API keys exist ONLY in server-side environment variables. Never in app code or repo.
4. **NOT A MEDICAL DEVICE.** Never diagnose, never recommend insulin/medication/treatment, never predict glucose from a photo, never say a meal "caused" a reading.
5. AI nutrition values are estimates: always MIN–MAX ranges, always labelled "AI estimate", user can edit/accept/discard.
6. Timestamps stored as LOCAL date-time strings. No UTC conversion.
7. One glucose unit throughout (default mg/dL, configurable, labelled everywhere).
8. Reading context is optional. Save null if unset; show "Context not specified".
9. Pattern cards appear ONLY with 3+ matching pairs (readings 1–3h after a meal). Every card includes verbatim disclaimer: *"These are recorded associations only. Many factors affect glucose, and this does not show that a meal caused a reading."*
10. Footer everywhere: *"PlateLine is a journaling tool, not a medical device."*

## Milestone 1 Status
- [x] Expo app scaffolded
- [x] Folders: `src/components`, `src/screens`, `src/db`, `src/lib`, `src/styles`, `worker/`
- [x] Bottom tab navigation (Timeline, Add, Chart, Report, Settings)
- [x] Persistent medical disclaimer footer on all screens
- [x] Large tap targets and accessible typography (min 16px text)
- [x] Development server verified with Metro bundler & QR code

## Milestone 2 Status
- [x] SQLite data layer configured with `expo-sqlite`
- [x] Tables created: `readings`, `meals`, `photos`, `analyses`, `settings`
- [x] Complete CRUD helpers implemented with strict field boundaries
- [x] Time utilities (`src/lib/time.js`): `nowLocalInputValue()`, `formatDisplay()`, `minutesBetween()`, and UTC shift prevention
- [x] Automated test runner (`scripts/test-time.js`): 17/17 tests passing
- [x] Hidden Dev/Test Screen (`DevTimestampTestScreen.js`): verifies save → reload → non-time edit → timestamp unchanged rule in real-time
- [x] Live access from Settings tab in Expo Go

