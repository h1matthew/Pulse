# Pulse — FBLA Coding & Programming 2025-2026 Presentation Script

**Team:** Felix Yin, Matthew Heng, Oscar Gao — Diamond Bar FBLA
**Event:** Coding & Programming — "Byte-Sized Business Boost"
**Time:** 7 minutes presentation + 3 minutes Q&A

---

## OPENING — Felix (0:00–0:40)

Good morning, judges. My name is Felix Yin, and joining me are Matthew Heng and Oscar Gao. We represent the Diamond Bar FBLA chapter, and today we are presenting our solution to the 2025-2026 "Byte-Sized Business Boost" challenge: **Pulse**.

## THE PROBLEM — Oscar (0:40–1:20)

Take a look at the candles and soaps in front of you — these were all made by a small business run by Felix's mom. But here is the reality: consumers default to national chains like Bath & Body Works because small businesses lack an affordable, unified platform for discovery and engagement. They are buried under big-brand SEO and paid ads. Our solution, Pulse, gives every local business equal visibility with zero install barrier for consumers and zero cost for business owners.

---

## CODE QUALITY — Rubric Rows 1, 2, 3 (20 pts)

### Row 1: Coding Language Selection (5 pts) — Felix (1:20–1:50)

> *[Show: tsconfig.json strict mode + a TypeScript interface]*

We chose **TypeScript with Strict Mode** as our language. We selected TypeScript over JavaScript specifically for its static type analysis — strict mode enforces zero implicit `any` types, catching entire categories of runtime bugs at compile time. This gives us the same type safety guarantees as statically-typed languages like Java, but with the flexibility of the JavaScript ecosystem. Every function parameter, return value, and data structure is explicitly typed.

### Row 2: Comments & Naming Conventions (5 pts) — Felix (1:50–2:10)

> *[Show: a route file header with USER JOURNEY, DESIGN RATIONALE, INPUT VALIDATION, ACCESSIBILITY sections]*

Our code comments follow a structured documentation standard. Every API route and component opens with four labeled sections: **User Journey** describes the step-by-step path, **Design Rationale** explains why we made specific choices, **Accessibility Notes** document ARIA attributes and keyboard behavior, and **Input Validation** lists both syntactical and semantic checks. This gives judges — and future developers — a complete map of every module.

### Row 3: Modular Program (10 pts) — Matthew (2:10–2:40)

> *[Show: project folder structure briefly]*

Our architecture is built on **Next.js 16 App Router** with a clear separation of concerns. React **Server Components** handle data fetching with zero client JavaScript, while **Client Components** manage interactivity. Our data layer uses **Supabase** with PostgreSQL for real-time subscriptions and row-level security. The codebase is organized into `components/features/`, `hooks/`, `lib/`, and `types/` — each module has a single responsibility. We deploy to **Vercel** for zero-ops CI/CD directly from our Git repository.

---

## USER EXPERIENCE — Rubric Rows 4, 5, 6, 7 (25 pts)

### Row 4: UX Design — User Journey, Design Rationale, Accessibility (10 pts) — Oscar (2:40–3:20)

> *[Show: homepage → discover → business detail flow]*

**User Journey:** A user lands on the homepage, sees featured businesses without needing an account. They click Discover to browse by category, sort by rating, or search by keyword. Tapping a business card reveals reviews, hours, and active deals. Signing in unlocks reviews, bookmarks, and deal claims. The Dashboard then tracks their personal economic impact.

**Design Rationale:** We use a mobile-first responsive grid with fluid breakpoints from 375-pixel mobile to 1440-pixel desktop. Card-based layouts let users scan and act without entering detail pages. Skeleton loaders match the final layout to eliminate content shift.

**Accessibility:** All interactive elements meet **WCAG contrast thresholds**. We support **dark mode and light mode**. The app is fully **keyboard navigable** — every action is reachable via Tab and Enter. Screen readers receive announcements via `aria-live` regions when content updates.

### Row 5: Intuitive UI (5 pts) — Oscar (3:20–3:30)

> *[Show: clear navigation bar, labeled buttons]*

Buttons are clearly labeled, navigation is persistent across all pages, and the category filter pills provide instant visual feedback with pressed states.

### Row 6: Navigation + Intelligent Feature (5 pts) — Felix (3:30–3:50)

> *[Show: AI Assistant page]*

Our navigation system includes a persistent header, breadcrumbs on detail pages, and a help menu. For the intelligent feature, we built a **Google Gemini-powered AI assistant** that answers natural-language questions about local businesses, your impact stats, and how Pulse works — a fully interactive Q&A.

### Row 7: Input Validation — Syntactical & Semantic (5 pts) — Felix (3:50–4:10)

> *[Show: review form validation + login CAPTCHA]*

We validate input on **both levels**. **Syntactical:** Zod schemas enforce that business IDs are valid UUIDs, ratings are integers between 1 and 5, review content is 10 to 2,000 characters, and emails follow the correct format. **Semantic:** We check if a user has already reviewed a business — 409 Conflict — verify CAPTCHA tokens server-side, and auto-set verified purchase status from check-in history. Error messages are specific and displayed inline.

---

## FUNCTIONALITY — Rubric Rows 8, 9, 10 (25 pts)

### Row 8: All 6 Prompt Features (10 pts) — Matthew Live Demo (4:10–5:40)

> *Matthew walks through each feature live*

Now I will demonstrate all six required features live.

**1. Sort by Category:**
> *[Click category pills: Food & Drink, Retail, Services, etc.]*

The Discover page has category filter pills — Food & Drink, Retail, Services, Health & Wellness, Arts & Culture, Entertainment. Clicking filters instantly — it is client-side filtering with no network delay.

**2. Leave Reviews & Ratings:**
> *[Open a business → scroll to reviews → submit a review with star rating]*

Users can leave star ratings from 1 to 5 with written reviews. The form validates content length and rating range in real time.

**3. Sort by Reviews/Ratings:**
> *[Change sort dropdown to "Highest Rated" then "Most Reviewed"]*

The sort dropdown supports Highest Rated, Most Reviewed, Nearest, and A-Z. Our default ranking uses a weighted score — rating multiplied by the log of review count — so a 4.5-star business with 800 reviews ranks above a 5-star with one review.

**4. Bookmark Favorites:**
> *[Tap the heart icon on a business card → show bookmarks page]*

Tapping the heart icon saves a business to your Bookmarks page. Bookmarks persist across sessions and sync in real time.

**5. Deals & Coupons:**
> *[Navigate to Deals page → show available and claimed tabs]*

The Deals page shows active offers with redemption codes. Users can claim deals, and the Claimed tab tracks redeemed versus pending status.

**6. Bot Verification:**
> *[Show the CAPTCHA puzzle on the login page]*

Before submitting reviews, users must complete a sliding puzzle CAPTCHA. The token is verified server-side. This prevents automated spam while keeping the experience frictionless.

### Row 9: Customizable Report Output (10 pts) — Matthew (5:40–6:10)

> *[Open Dashboard → click "Impact Report" → show filters → download CSV → print]*

Our Impact Report is fully customizable. Users can filter by **date range** — this week, this month, or all time — and by **category**. The report shows dollars kept local, businesses supported, jobs impacted, and carbon saved, with a category breakdown chart, business table, review list, and activity timeline. Users can **download as CSV** or **print** a clean, formatted PDF. The business table columns are sortable by name, visits, spending, or last visit.

### Row 10: Data Storage (5 pts) — Felix (6:10–6:30)

> *[Show DevTools → Application → Local Storage → pulse-query-cache]*

We use **multiple levels of data storage**. Supabase PostgreSQL stores businesses, reviews, bookmarks, deals, and impact metrics with proper foreign keys and row-level security. On the client, **React Query persists to localStorage** with a 24-hour TTL — so the app loads instantly on return visits without hitting the API. Variables use clear naming, appropriate scope, and we store complex structures in arrays and typed objects.

---

## CLOSING — Felix (6:10–6:40)

As you can see, Pulse generates meaningful data to prove its community impact. With over 200 businesses indexed across 6 categories, active deals, verified reviews, and bookmarks, our engine tracks an estimated local economic impact of over $1,800 through digital engagements. We maintain full documentation with setup instructions and credits alongside the generatable user report.

## CONCLUSION — Oscar (6:40–7:00)

In conclusion, Pulse delivers a true "Byte-Sized Business Boost" by combining type-safe, secure technical architecture with real community engagement. It is not just a demonstration — it is a fully functional, scalable platform ready to support local businesses today. Thank you for your time, and we are happy to answer any questions.

---

## Q&A PREP (Row 13 — 10 pts)

**Likely questions and answers:**

**Q: Why did you choose Next.js over other frameworks?**
A: Next.js gives us both server and client rendering in one framework. Server Components reduce the JavaScript sent to the browser, making pages load faster. The App Router provides file-based routing with built-in layouts and loading states. And Vercel deployment means zero server management — we push code and it is live in seconds.

**Q: How do you prevent fake reviews?**
A: Three layers. First, users must complete a sliding puzzle CAPTCHA verified server-side. Second, we check for duplicate reviews — one review per user per business. Third, the system auto-sets a "verified purchase" badge based on check-in history, so readers can distinguish organic reviews.

**Q: How is the economic impact calculated?**
A: Research from the American Independent Business Alliance shows that 68 cents of every dollar spent at a local business recirculates in the community, compared to 43 cents at a chain. We apply this multiplier to tracked engagements — check-ins, deal claims, and reviews — to estimate dollars kept local. Jobs impacted uses the ratio of approximately 1 job per $15,000 in local spending.

**Q: How do you handle user data security?**
A: Supabase provides row-level security so users can only access their own data. Passwords are hashed by Supabase Auth, never stored in plaintext. All API routes validate authentication before processing mutations. Session tokens are stored in HTTP-only cookies, not localStorage.

**Q: What makes Pulse different from Yelp or Google Maps?**
A: Yelp and Google Maps are great for finding businesses, but they do not track your personal economic impact. Pulse shows users exactly how their engagement — every review, bookmark, and deal claimed — strengthens the local economy. The dashboard gamifies support with tiers, missions, and a community leaderboard. It turns passive browsing into active community building.

**Q: How does the AI assistant work?**
A: We use Google's Gemini API. The assistant receives context about Pulse features and the user's local area, then responds to natural-language questions in a streaming chat interface. It can answer questions about nearby businesses, explain features, and provide recommendations based on user preferences.

**Q: What would you improve with more time?**
A: Three things. First, a business owner portal where owners can claim their listing, respond to reviews, and create deals directly. Second, push notifications when bookmarked businesses post new deals. Third, a mobile app using React Native to share our component library with the web version.

---

## RUBRIC CHECKLIST

| Row | Criterion | Points | Where Addressed |
|-----|-----------|--------|-----------------|
| 1 | Coding language selection with explanation | 5 | Felix — TypeScript strict mode, why over JS |
| 2 | Comments, naming, formatting | 5 | Felix — structured doc standard (User Journey, Design Rationale, etc.) |
| 3 | Modular, logical, readable | 10 | Matthew — Next.js App Router, component separation, folder structure |
| 4 | UX Design (journey, rationale, accessibility) | 10 | Oscar — full user journey, mobile-first, WCAG, keyboard nav, dark mode |
| 5 | Intuitive UI / clear instructions | 5 | Oscar — labeled buttons, persistent nav, visual feedback |
| 6 | Navigation + intelligent feature | 5 | Felix — header nav, help menu, Gemini AI assistant (interactive Q&A) |
| 7 | Input validation (syntactical + semantic) | 5 | Felix — Zod schemas + duplicate check, CAPTCHA, verified purchase |
| 8 | All 6 prompt features | 10 | Matthew demo — category sort, reviews, rating sort, bookmarks, deals, CAPTCHA |
| 9 | Customizable report output | 10 | Matthew — date range filter, category filter, CSV download, print, sortable table |
| 10 | Data storage (arrays, lists, scope) | 5 | Felix — PostgreSQL + localStorage cache, typed arrays, proper scope |
| 11 | Well-organized presentation | 10 | Script flow: problem → code → UX → features → demo → closing |
| 12 | Confidence, body language, eye contact, voice | 10 | Practice delivery |
| 13 | Q&A effectiveness | 10 | Q&A prep above |
| 14 | Protocol adherence | 10 | Follow all device/material rules |
| **TOTAL** | | **110** | |
