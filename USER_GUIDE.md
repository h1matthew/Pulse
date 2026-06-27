# Pulse User Guide

Pulse helps judges, visitors, and local shoppers discover nearby businesses, interact with them, and see how that activity supports the local economy.

## Access Model

- Anyone can browse businesses, categories, deals, missions, and public impact pages.
- Signing in unlocks saved bookmarks, reviews, deal claims, check-ins, personal dashboard history, and settings.

## Required FBLA Features

### 1. Sort By Category

Use `Categories` to browse groups such as Food & Drink, Retail, Services, Health & Wellness, Arts & Culture, and Entertainment.

Use `Discover` to narrow the business feed by category, search text, location, and radius.

### 2. Reviews And Ratings

Open a business detail page and choose the Reviews tab. Signed-in users can leave a 1-5 star review with written feedback.

Pulse validates review content before submission and shows clear errors when a rating or required text is missing.

### 3. Sort By Reviews Or Ratings

On `Discover`, use the sort control to reorder businesses by top rated, most reviewed, distance, or name.

Top rated uses rating and review count together so one-review outliers do not outrank better-supported businesses.

### 4. Bookmark Favorites

Use the bookmark control on business cards or business detail pages.

Signed-in bookmarks sync to the account. Signed-out visitors can still save locally and are invited to sign in when they want cross-device sync.

### 5. Deals And Coupons

Open `Deals` to view available offers from local businesses.

Signed-in users can claim a deal, receive a redemption code, and review claimed deals from the Claimed tab.

### 6. Bot Verification

Review submission uses bot-prevention checks and server-side validation before writing to the database.

Sensitive routes also use rate-limiting and ownership checks so repeated automated actions cannot easily spam reviews, claims, or check-ins.

## Advanced Features

### Gemini Assistant

Open `Assistant` or use the chat widget to ask for business recommendations, help with Pulse features, or an explanation of your impact.

The assistant retrieves relevant business and impact data before answering, so it can recommend real businesses instead of generic examples.

Try:

- `Find highly rated coffee shops near me.`
- `What happens when I bookmark a business?`
- `How do I claim a deal?`
- `What does my impact dashboard mean?`

### Custom Impact Report

Open `Dashboard` and use the impact report controls to review local dollars, supported businesses, jobs impact, carbon savings, activity, and category breakdowns.

The report supports:

- Date range filtering.
- Category filtering.
- Sortable business/activity tables.
- CSV download.
- Print-friendly output.

### Boost Missions

Open `Missions` to start local challenges such as trying new businesses in a category.

Mission progress updates as users check in or complete qualifying activity. Completed missions can unlock rewards.

### Community Pulse And Leaderboard

Community pages show aggregate local impact and ranking tiers. They help judges see that Pulse is not only a directory; it turns local engagement into measurable community outcomes.

## Demo Path For Judges

1. Start on the homepage and explain the local economic impact idea.
2. Open `Discover`, filter by a category, and sort by rating or review count.
3. Open a business detail page and show reviews, bookmark, check-in, and deals.
4. Claim a deal or show a claimed deal code.
5. Open `Missions` and show mission progress.
6. Open `Dashboard`, adjust report filters, export CSV, and show print output.
7. Open `Assistant` and ask for a recommendation or report explanation.
8. Briefly show this guide and the root `README.md` as written program documentation.

## Help And Accessibility

- Use the Help menu for feature guidance and keyboard shortcuts.
- The onboarding tour walks new users through the main workflow.
- Pulse includes skip-to-content navigation, focus-visible outlines, modal focus traps, ARIA live regions, and reduced-motion support.

## Troubleshooting

| Problem | What To Try |
|---|---|
| A page asks you to sign in | Sign in to use account-owned features such as reviews, bookmarks, claims, check-ins, and personal impact |
| A review will not submit | Check that the rating, review text, and bot verification are complete |
| No businesses appear | Adjust category, search, location, or radius filters |
| The assistant cannot answer | Check the connection and Gemini API configuration |
| Reports look empty | Add check-ins, deal claims, bookmarks, reviews, or use seeded demo data |
