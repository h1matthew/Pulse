# Q&A Prep — 15 Likely Judge Questions

Practice these out loud. Answers are written to be spoken in 20–40 seconds.
Any team member may be asked — everyone should be able to give at least the
first two sentences of every answer.

---

**1. Why did you choose TypeScript/Next.js over something simpler like Python?**
TypeScript's static types catch bugs at compile time — a wrong argument or a null reference fails the build instead of crashing in front of a user. Next.js gives us server-side rendering, API routes, and one deployable artifact. We considered Python/Flask, but we'd lose end-to-end type safety: with TypeScript, the same interface that describes a database row also type-checks the UI component rendering it.

**2. Walk me through what happens when a user submits a review.**
The client validates with a Zod schema — rating 1–5, content 10–2,000 characters — and shows inline errors instantly. On submit, the CAPTCHA token plus payload go to our API route, which re-verifies the CAPTCHA server-side, re-runs the same Zod schema, then applies semantic checks: a duplicate review returns 409 with a friendly message, and `verified_purchase` is computed from check-in history — never trusted from the client. A database trigger then recalculates the business's average rating.

**3. What's the difference between your syntactic and semantic validation?**
Syntactic is format: is the rating an integer in range, is the ID a valid UUID, is the email shaped like an email. Semantic is meaning: has this user already reviewed this business, is the CAPTCHA token genuine, did they actually check in. Format checks live in shared Zod schemas; meaning checks need database context, so they run server-side.

**4. How does your intelligent feature actually decide what to recommend?**
It's retrieval-augmented generation. We extract keywords from the question, detect category and amenities with keyword maps, query our own Supabase database for matching businesses, and pass only those real results to Gemini as context. The model phrases the answer; the facts come from our data — so it can't recommend a business that doesn't exist.

**5. How do you prevent bots and abuse?**
Three layers: a CAPTCHA on reviews and login (a sliding-puzzle challenge that works fully offline, or Cloudflare Turnstile in production) verified server-side; rate limiting keyed on IP plus user ID; and a honeypot field on the contact form. Validation rejects anything malformed before it reaches the database.

**6. Why PostgreSQL/Supabase instead of a simple file or SQLite?**
We need relational integrity — reviews, bookmarks, and claims all reference users and businesses with foreign keys and unique constraints, so duplicates are impossible at the data layer. Supabase adds row-level security: the database itself refuses to return another user's bookmarks, even if our application code had a bug. PostGIS handles distance queries for "near me."

**7. What data structures did you use and why?**
Typed arrays of interface objects for all lists — businesses, reviews, deals — because render order matters and React maps arrays directly. Objects/records for keyed lookups like business hours. Sets for membership tests like bookmarked IDs. Every shape is a TypeScript interface, so the compiler enforces consistency between database, API, and UI.

**8. How do you manage variable scope?**
Narrowest scope that works: module-level constants for static data like categories; component state via useState strictly for UI concerns like the active filter; server data lives in the React Query cache keyed by query, never in globals; and helpers are pure functions taking explicit parameters. No mutable global state anywhere.

**9. How would this scale to 100,000 users?**
The stack is already horizontal: Next.js on Vercel scales serverlessly per request, PostgreSQL handles the read-heavy load with indexes we already have (rating, category, geo). Next steps would be CDN caching of business listings, read replicas, and moving review-count aggregation to materialized views. The rate limiter already runs on Redis, which is distributed.

**10. What accessibility features did you implement?**
Skip-to-content link, focus trapping in dialogs, aria-live regions announcing async results to screen readers, WCAG-checked contrast in both themes, full keyboard navigability, semantic landmarks, and we honor the OS reduced-motion preference. We also keep a dedicated accessibility test suite.

**11. Where did the business data come from, and is it licensed?**
Business listings come from the Google Places API under the Google Maps Platform terms, with attribution preserved. Everything else — reviews, bookmarks, impact — is user-generated in our own database. All open-source libraries and their licenses (MIT, ISC, Apache 2.0) are documented in the README.

**12. How is the economic impact number calculated?**
Check-ins record spend; we apply the American Independent Business Alliance multiplier — about 68 cents per dollar recirculates locally versus 43 at a chain. Jobs are estimated at one per $15,000 of local spending, and carbon savings at half a pound of CO₂ per local visit versus shipped alternatives. They're labeled as estimates in the UI.

**13. What was the hardest bug or design problem?**
Keeping validation consistent between client and server without duplicating logic — we solved it by sharing one Zod schema file imported by both sides, so the rules literally cannot drift apart. Runner-up: making the CAPTCHA work offline for the demo without weakening production, solved with a provider abstraction that swaps Turnstile for a local puzzle.

**14. What would you improve with more time?**
Three things. First, wire the stored user preferences into a personalized ranking pass on the Discover feed — the data model is there, the scoring isn't yet. Second, offline-first caching with a service worker. Third, a business-owner portal so owners can claim listings and post their own deals.

**15. Why does this matter — who actually uses it?**
A shopper who wants to support local but defaults to chains out of convenience. Pulse removes the friction — discovery, deals, and trust signals in one place — then closes the loop by showing the impact: "you kept $1,800 in your community." That feedback turns a one-time visit into a habit, which is exactly what the prompt asked for: a tool that helps users discover *and support* local businesses.
