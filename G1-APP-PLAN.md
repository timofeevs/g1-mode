# Ontario G1 Test Prep App — Build Plan (iOS + Android)

**Status:** Draft v1 · **Author:** Hermes Agent
**Goal:** Ship a Gen-Z-styled Ontario G1 knowledge-test prep app to both the App Store and Google Play, on a codebase that doubles as a reusable template for the 8–10 province portfolio.
**Stack:** React Native + Expo SDK 57 · TypeScript · expo-router · Zustand · expo-sqlite · RevenueCat · Expo Updates (OTA) · react-native-reanimated · expo-haptics · PostHog (free tier)

---

## 1. Platform Decision

| Factor | React Native + Expo | Flutter | Two native (SwiftUI + Kotlin) |
|---|---|---|---|
| Shared code iOS/Android | ~95% | ~95% | 0% (UI + logic ×2) |
| Portfolio cost (8 province apps) | 1 codebase, swap content | 1 codebase, swap content | 16 apps to maintain |
| OTA content fixes | ✅ Expo Updates (first-class) | ⚠️ Shorebird (3rd-party, cold-start) | ❌ store review each fix |
| Ecosystem / AI tooling | TypeScript — largest pool | Dart — smaller | Swift + Kotlin, two languages |
| Time to v1 (solo) | Fastest | Comparable | ~2× slowest |

**Verdict: React Native + Expo.** A quiz app has zero platform-specific needs (no camera/AR/sensors); building twice wastes effort and kills the portfolio model. Expo wins over Flutter on the OTA content pipeline — the #1 way to fix handbook-drift question errors without store resubmission, which directly protects app-store ratings.

---

## 2. Product Spec

**Audience:** Gen Z (16–19) + adult/newcomer first-timers preparing for the Ontario G1 knowledge test.

**Real test format (must mirror exactly):** 40 questions — 20 road signs + 20 rules of the road; pass = 16/20 per section (80%). No time limit. Content drawn from the MTO *Driver's Handbook*.

**Monetization (RevenueCat; free until $2,500/mo tracked revenue, then 1%):**
- Free: ~50 sample questions, daily practice cap, 1 full simulation
- $9.99 / 1 month (primary)
- $19.99 / 3 months
- $24.99 lifetime (undercut myDMV's $29.99)

**Gen Z UX:** dark mode, streaks, test-date countdown, 60s TikTok-style rule explainers, haptics, bold palette, social login.

**Screens:** Home (countdown · readiness ring · streak) · Practice · Full simulation · Review (spaced rep) · Explainers · Paywall · Profile.

---

## 3. Repo Structure

```
g1-app/                       # NEW GitHub repo (separate from g1-mode)
├── app/                      # expo-router routes
│   ├── _layout.tsx
│   ├── index.tsx             # Home
│   ├── practice.tsx
│   ├── simulation.tsx
│   ├── review.tsx
│   ├── explainers.tsx
│   ├── paywall.tsx
│   └── profile.tsx
├── src/
│   ├── components/           # QuestionCard, StreakBadge, CountdownTimer…
│   ├── data/
│   │   ├── questions.ts      # 400–500 MTO-derived questions
│   │   ├── questions.v1.json # versioned data package (OTA-able)
│   │   └── schema.ts         # Question type + Zod validation
│   ├── engine/
│   │   ├── spacedRepetition.ts  # SM-2
│   │   ├── readinessScore.ts
│   │   └── session.ts
│   ├── store/
│   │   ├── useAppStore.ts      # Zustand: progress, streaks, settings
│   │   └── useSubscription.ts  # RevenueCat wrapper
│   ├── services/
│   │   ├── revenuecat.ts
│   │   ├── analytics.ts        # PostHog
│   │   └── storage.ts          # expo-sqlite
│   └── theme/
│       ├── colors.ts           # dark-first palette
│       └── typography.ts
├── assets/                   # icons, launch screen, explainer videos
├── eas.json                  # EAS Build config
├── app.config.ts             # Expo config, RevenueCat keys
└── package.json
```

---

## 4. Tasks by Phase

### Phase 0 — Foundation (Week 1)
- **0.1 Scaffold Expo app** — `npx create-expo-app g1-app --template blank-typescript`; install expo-router, expo-sqlite, expo-haptics, reanimated, expo-linear-gradient, datetimepicker, zustand. Verify: `npx expo start` boots.
- **0.2 Configure EAS + dev builds** — `eas login` + `eas build:configure`; `eas.json` with dev/preview/production; verify a dev build on iOS.
- **0.3 Theme (dark-first)** — palette (bg `#0B0D17`, card `#151A2B`, violet `#6C5CE7`, cyan `#00D2FF`, success `#00E08A`, danger `#FF5D5D`); Space Grotesk via expo-font; ThemeProvider in `_layout`.

### Phase 1 — Content: THE MOAT (Week 1–2)
- **1.1 Question schema** — `schema.ts` + Zod: `{id, category, difficulty, text, image?, options[4], correctIndex, explanation, handbookRef}`.
- **1.2 Author 400–500 questions** — derive from public MTO *Driver's Handbook* (~250 road signs + ~200 rules of the road); AI-draft, **human-verify every question**; save as `questions.v1.json`.
- **1.3 SM-2 spaced repetition** — `spacedRepetition.ts` + expo-sqlite persistence; unit tests on interval growth/decay.
- **1.4 Readiness score** — derived from last 3 full simulations ≥ 90% + category coverage.

### Phase 2 — Core UX (Week 2–3)
- **2.1 Data layer** — expo-sqlite tables (`cards`, `sessions`, `settings`); PostHog analytics. Verify persistence across restart.
- **2.2 Practice flow** — QuestionCard + practice screen; category filter; session lengths 10/20/40; haptic + instant feedback + explanation.
- **2.3 Full simulation** — exact 40-question split 20/20 with per-section 16/20 pass tracking; result screen with readiness update + "review misses".
- **2.4 Review queue** — pull due SM-2 cards; miss-replay.
- **2.5 Home dashboard** — countdown, readiness ring, streak flame, continue deep-link.

### Phase 3 — Monetization (Week 3)
- **3.1 RevenueCat** — entitlements "premium"; create products (onemonth_9.99, threemonths_19.99, lifetime_24.99) in App Store Connect + Play Console.
- **3.2 Paywall screen** — 3 plans, benefits, urgency copy ("test in 12 days — pass first try").
- **3.3 Feature gating** — gate full bank / spaced rep / readiness / unlimited sims behind entitlement.

### Phase 4 — Gen Z Polish + Explainers (Week 4)
- **4.1 Micro-animations + haptics** — reanimated transitions, streak flame, particle feedback.
- **4.2 Explainers** — 20–30 TikTok-style 60s rule shorts (bundled MP4 + subtitles default-on).
- **4.3 Onboarding + social login** — Google + Apple sign-in; 3-step onboarding (test date → style → goal).

### Phase 5 — Launch (Weeks 4–5)
- **5.1 OTA + CI/CD** — Expo Updates to `production` channel with staged rollouts; GitHub Actions (lint, typecheck, tests → EAS build on main).
- **5.2 Store assets + ASO** — icon, 6 screenshots/platform, keyword-optimized metadata ("G1 Test Ontario 2026"; primary keyword "G1 practice test").
- **5.3 Beta** — TestFlight + Play Internal Testing to ~20 Gen Z testers (driving-school FB groups / high schools).
- **5.4 Launch** — submit both stores; monitor RevenueCat + PostHog.

---

## 5. Engineering Rules

- **Content is data, not code** — `questions.v1.json` is swappable per province and OTA-fixable; never hardcode into components.
- **Local-first** — all practice works offline; analytics fire-and-forget.
- **DB intent:** `cards(id, questionId, ease, interval, repetitions, dueDate, lapses)` · `sessions(id, startedAt, type, scored, passed)` · `settings(key, value)`.
- **i18n-ready structure** even though v1 is English-only (Quebec French later).
- **Accessibility:** touch targets ≥ 44px, dynamic type where cheap.

---

## 6. Verification / Acceptance Criteria

- [ ] Dev build runs on iOS + Android
- [ ] 40-question simulation scores exactly per real rules (16/20 each section)
- [ ] SM-2 schedules reviews correctly (unit-tested)
- [ ] Free tier caps; premium unlocks via RevenueCat on both sandboxes
- [ ] Bank ≥ 450 questions, passes Zod, no duplicate IDs, all explanations present
- [ ] OTA ships a question fix without store resubmission
- [ ] App live on both stores

---

## 7. Risks / Open Questions

- **ASO moat:** incumbents own "G1 practice test" keyword → differentiate on screenshots + "doesn't look like 2015"; budget 3–6 months ASO.
- **Content accuracy:** every question verified vs current handbook; OTA mitigates drift. Watch MTO syllabus updates.
- **RevenueCat threshold:** free to $2.5k/mo, then 1% — fine at pilot scale; revisit at portfolio scale.
- **Open questions for user:**
  1. Premium anchor: 1-week or 1-month primary?
  2. Social login or email-only for v1? (Apple requires *some* sign-in option)
  3. Explainers: self-film, license stock, or AI-generate?
  4. Launch: iOS-first or simultaneous?
  5. Git identity + `gh` CLI — needed before we can create/push the `g1-app` repo.

---

## 8. Suggested Order

Phases 0→5 sequential. Phase 1 (content) is the critical path and the moat — start it early, parallel with Phase 2–3 dev. One task per commit; subagent-driven execution (spec review then code review per task).
