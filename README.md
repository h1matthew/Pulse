# Pulse - Local Business Discovery Platform

Pulse is a local business discovery platform that shows users exactly how their spending and engagement strengthens their local economy. Every interaction feeds into a live economic impact dashboard, creating a powerful narrative around community empowerment.

## Features

### Core Features
- **Business Discovery**: Browse local businesses by category (Food & Drink, Retail, Services, Health & Wellness, Arts & Culture, Entertainment)
- **AI-Matched "For You" Feed**: Personalized recommendations based on ratings, bookmarks, and preferences
- **Verified Reviews**: 5-star rating system with bot prevention via CAPTCHA
- **Bookmarks**: Save favorite businesses to support later
- **Deals & Boost Missions**: Special offers and challenge-based rewards from local businesses

### Economic Impact Dashboard
- **Personal Impact Metrics**: Track dollars kept local, businesses supported, and jobs impacted
- **Community Pulse**: Aggregate impact across all users with real-time metrics
- **Impact Leaderboard**: Compete with other community members
- **Visual Analytics**: Charts and progress indicators showing your economic footprint

### Boost Missions
- Challenge-based system (e.g., "Try 3 new coffee shops this month")
- Progress tracking with unlockable perks
- Gamified engagement that drives real business visits

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom OKLCH color palette
- **UI Components**: shadcn/ui + Radix UI
- **Database**: Supabase (PostgreSQL + Auth)
- **State Management**: TanStack React Query

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pulse.git
cd pulse/web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
SUPABASE_SECRET_KEY=your_supabase_secret
```

4. Set up the database:
```bash
npm run db:setup
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Database Schema

The platform uses a comprehensive PostgreSQL schema including:

- **Businesses**: Store listings with categories, ratings, and verification
- **Reviews**: User ratings and reviews with verification
- **Bookmarks**: User-saved businesses
- **Deals**: Special offers and Boost Missions
- **User Impact**: Economic impact tracking per user
- **Community Pulse**: Aggregate community metrics

See `web/supabase/pulse_schema.sql` for the complete schema.

## Project Structure

```
web/
├── app/                    # Next.js App Router
│   ├── (app)/             # Authenticated routes
│   ├── (public)/          # Public pages
│   ├── discover/          # Business discovery
│   ├── dashboard/         # Impact dashboard
│   ├── missions/          # Boost Missions
│   ├── deals/             # Deals page
│   ├── bookmarks/         # User bookmarks
│   └── categories/        # Category browsing
├── components/
│   ├── ui/                # shadcn components
│   ├── layout/            # Layout components
│   └── features/          # Feature components
├── lib/
│   ├── constants/         # Navigation, categories
│   └── supabase/          # Database helpers
└── supabase/
    └── pulse_schema.sql   # Database schema
```

## Key Features Implementation

### Economic Impact Calculation
The platform calculates impact using:
- Estimated dollars kept local (68% of spending stays local for small businesses)
- Jobs impacted (roughly 1 job per $100k in local spending)
- Review and engagement multipliers

### AI Recommendation Engine
- Collaborative filtering based on similar users
- Category preference weighting
- Rating history analysis
- Location proximity scoring

### Boost Missions System
- Mission templates with configurable targets
- Progress tracking with visual indicators
- Reward unlock system
- Time-limited challenges

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

Built for the FBLA competition with the goal of empowering communities through technology.

---

**Pulse** - Strengthening local economies, one discovery at a time.
