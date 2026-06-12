# DEMO_SCRIPT.md — 2-Minute Live Demo (click-by-click)

Driver: **Matthew**. Narration is in SPEAKER_SCRIPT.md Slide 7 (~280 words).
Target: **2:00 flat**. Rehearse with a stopwatch until it's automatic.

## Pre-flight (do this the night before AND in the prep room)

1. **The venue has no reliable internet and no electricity.** Charge the laptop
   to 100% (plus a charged backup laptop). The app must run fully offline:
   - Start the local Supabase stack (Docker): `supabase start`, with the seeded
     database (`cd web && npm run db:setup`, then `node scripts/seed-demo-user.mjs`).
   - `.env` pointed at the local stack; `NEXT_PUBLIC_CAPTCHA_PROVIDER=local`
     (the sliding-puzzle CAPTCHA runs with zero network).
   - Run the **production build** (`npm run build && npm run start`) — faster
     and no dev-mode overlays.
   - ⚠️ The AI assistant requires the Gemini API (online). If the venue has no
     internet, **skip the live assistant demo** — it is covered by the Slide 8
     screenshot — or show the cached conversation already on screen.
2. Log in beforehand as `judge@pulse.demo` / `PulseDemo2026!` (account is
   seeded with bookmarks, reviews, check-ins, and claimed deals so every page
   looks alive).
3. Open tabs in order, left to right: ① `/discover` ② a business detail page
   that the demo account has NOT yet reviewed ③ `/bookmarks` ④ `/deals`
   ⑤ `/dashboard`. Zoom 110%, close every other app, hide the dock,
   Do Not Disturb on.
4. Clear localStorage ONLY if you want to show the onboarding tour; otherwise
   leave it so no tour dialog interrupts the demo.

## The 2:00 path

| Time | Tab | Action | Says/shows |
|---|---|---|---|
| 0:00 | ① Discover | Click **Food & Drink** pill, then **Retail**, back to Food & Drink | Category sort — instant, client-side |
| 0:20 | ① | Open sort dropdown → click **Top rated** | Sort by ratings (weighted by review volume) |
| 0:35 | ② Business page | Reviews tab → click **4 stars** → paste/type a short review (>10 chars; have one memorized) | Reviews & ratings + inline validation |
| 0:55 | ② | Click **Verify CAPTCHA** → drag slider piece into the dashed slot → Verify → **Submit** | Bot verification, live, then review appears |
| 1:15 | ② | Click the **heart/bookmark** icon → switch to tab ③ | Favorites saved; bookmarks page already populated |
| 1:25 | ④ Deals | Click **Claim deal** on the top offer → open **Claimed** tab, point at redemption code | Deals & coupons with codes |
| 1:40 | ⑤ Dashboard | Click **Download My Impact Report** → change category filter → point at chart → click **Download CSV** | Customizable report / output & analysis |
| 1:58 | — | Close the modal, face the judges | "Every required feature, live, zero errors." |

**Discipline rules**
- Never type free-form text except the memorized review sentence.
- If anything unexpected appears, do not debug on stage — narrate the feature
  from the slide screenshot and move on.
- Do not open DevTools unless asked in Q&A (then: Application → Local Storage
  shows the query cache; it's a nice data-storage proof).

## Fallback plan (rehearse this too)

1. **Record a screen capture** of this exact 2-minute path at 1920×1080
   (QuickTime → File → New Screen Recording) and store it locally at
   `slides/demo-fallback.mov` on BOTH laptops. If the live app misbehaves,
   say: "In the interest of time, here's the same flow recorded" — and narrate
   over the video with the identical script. No internet needed.
2. If even video fails, the deck's screenshots cover every feature
   (slides 6–11) — narrate from those.
3. Backup of last resort: the `assets/` folder on a USB drive with all 21
   screenshots.

## Feature → requirement checklist (verify during rehearsal)

- [x] Sort by category — Discover pills
- [x] Leave reviews/ratings — business page form
- [x] Sort by reviews/ratings — Top rated dropdown
- [x] Bookmark favorites — heart + bookmarks page
- [x] Deals/coupons — claim + redemption code
- [x] Bot verification — puzzle CAPTCHA before submit
- [x] Customizable report — filters + CSV + print
- [x] Zero errors end-to-end, fully offline
