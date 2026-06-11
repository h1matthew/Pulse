import {
  ArrowRight,
  Gamepad2,
  HeartPulse,
  Palette,
  ShoppingBag,
  Store,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { NavLink } from "@/components/ui/nav-link";
import { createClient } from "@/lib/supabase/server";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface BusinessRow {
  category_id: string | null;
  name: string;
  average_rating: number | null;
  review_count: number | null;
  is_chain: boolean | null;
}

interface CategoryWithStats extends CategoryRow {
  businessCount: number;
  featured: string[];
}

/** Slug → lucide icon. Unknown slugs fall back to a generic storefront. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "food-drink": Utensils,
  retail: ShoppingBag,
  services: Wrench,
  "health-wellness": HeartPulse,
  "arts-culture": Palette,
  entertainment: Gamepad2,
};

/** Used only when a category row has no description in the database. */
const FALLBACK_DESCRIPTION = "Local businesses in this category.";

/**
 * Static fallback so the page still renders a useful directory if the
 * categories fetch fails. Counts will be zero because these ids will not
 * match any business rows.
 */
const FALLBACK_CATEGORIES: CategoryRow[] = [
  { id: "food-drink", slug: "food-drink", name: "Food & Drink", description: "Restaurants, cafes, bars, and food trucks", sort_order: 1 },
  { id: "retail", slug: "retail", name: "Retail", description: "Clothing, gifts, books, and specialty shops", sort_order: 2 },
  { id: "services", slug: "services", name: "Services", description: "Professional services and home maintenance", sort_order: 3 },
  { id: "health-wellness", slug: "health-wellness", name: "Health & Wellness", description: "Gyms, spas, salons, and healthcare", sort_order: 4 },
  { id: "arts-culture", slug: "arts-culture", name: "Arts & Culture", description: "Galleries, theaters, museums, and studios", sort_order: 5 },
  { id: "entertainment", slug: "entertainment", name: "Entertainment", description: "Arcades, bowling, cinemas, and venues", sort_order: 6 },
];

async function fetchCategories(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CategoryRow[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, description, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error || !data || data.length === 0) return FALLBACK_CATEGORIES;
    return data as CategoryRow[];
  } catch {
    return FALLBACK_CATEGORIES;
  }
}

async function fetchBusinesses(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<BusinessRow[]> {
  try {
    const { data, error } = await supabase
      .from("businesses")
      .select("category_id, name, average_rating, review_count, is_chain")
      .gt("average_rating", 0);
    if (error || !data) return [];
    return data as BusinessRow[];
  } catch {
    return [];
  }
}

/**
 * Per category: the real business count plus the top 3 businesses by rating
 * (tie-break: review count) as "featured" names. Independent businesses
 * (is_chain !== true) are preferred over chains.
 */
function buildCategoryStats(
  categories: CategoryRow[],
  businesses: BusinessRow[]
): CategoryWithStats[] {
  return categories.map((category) => {
    const matches = businesses.filter((b) => b.category_id === category.id);
    const featured = [...matches]
      .sort((a, b) => {
        const chainA = a.is_chain === true ? 1 : 0;
        const chainB = b.is_chain === true ? 1 : 0;
        if (chainA !== chainB) return chainA - chainB;
        const ratingDiff = (b.average_rating ?? 0) - (a.average_rating ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.review_count ?? 0) - (a.review_count ?? 0);
      })
      .slice(0, 3)
      .map((b) => b.name);

    return {
      ...category,
      businessCount: matches.length,
      featured,
    };
  });
}

function pluralizeBusinesses(count: number): string {
  return `${count} ${count === 1 ? "business" : "businesses"}`;
}

export default async function CategoriesPage() {
  const supabase = await createClient();
  const [categories, businesses] = await Promise.all([
    fetchCategories(supabase),
    fetchBusinesses(supabase),
  ]);

  const categoryStats = buildCategoryStats(categories, businesses);
  const totalLabel = `${pluralizeBusinesses(businesses.length)} across ${categories.length} ${categories.length === 1 ? "category" : "categories"}`;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="px-4 pb-12 pt-32 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {/* Page header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-10 border-b border-border pb-8">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Browse the directory
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Browse by Category
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Every place in the directory, organized by what it does.
              </p>
              <p className="mt-4 font-mono text-xs text-muted-foreground">
                {totalLabel}
              </p>
            </div>
          </AnimatedSection>

          {/* Category grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categoryStats.map((category, index) => {
              const Icon = CATEGORY_ICONS[category.slug] ?? Store;
              return (
                <AnimatedSection
                  key={category.id}
                  animation="fade-up"
                  delay={0.05 * (index + 1)}
                  className="h-full"
                >
                  <NavLink
                    href={`/discover?category=${category.slug}`}
                    aria-label={`Explore ${category.name}`}
                    className="group relative flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors duration-300 hover:border-primary/40"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors duration-300 group-hover:animate-heart-beat group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
                          {category.name}
                        </h2>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {category.description || FALLBACK_DESCRIPTION}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className="mt-4 font-mono text-sm text-primary">
                        {pluralizeBusinesses(category.businessCount)}
                      </p>

                      {category.featured.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground">
                            Top rated:
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {category.featured.map((name) => (
                              <span
                                key={name}
                                className="rounded bg-muted px-2 py-0.5 text-xs"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative mt-6 flex items-center justify-between border-t border-border pt-4">
                      {/* The divider is a flatline — on hover a heartbeat
                          trace draws itself along it, left to right. */}
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 300 24"
                        fill="none"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute -top-3 left-0 h-6 w-full text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      >
                        <path
                          d="M0 12 H112 L120 12 L126 3 L134 21 L140 12 H300"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          pathLength="1"
                          className="[stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-700 ease-out group-hover:[stroke-dashoffset:0]"
                        />
                      </svg>
                      <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                        Explore {category.name}
                      </span>
                      <ArrowRight
                        className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </div>
                  </NavLink>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
