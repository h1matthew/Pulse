import { MapPin, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { NavLink } from "@/components/ui/nav-link";
import { CATEGORY_FILTERS } from "@/lib/constants/navigation";

const CATEGORIES = [
  {
    id: "food-drink",
    name: "Food & Drink",
    description: "Restaurants, cafes, bars, and food trucks serving local flavors",
    icon: "🍽️",
    color: "oklch(0.7 0.16 45)",
    businessCount: 234,
    featured: ["The Local Bean", "Corner Bistro", "Artisan Bakery"],
  },
  {
    id: "retail",
    name: "Retail",
    description: "Clothing, gifts, books, and specialty shops",
    icon: "🛍️",
    color: "oklch(0.6 0.18 175)",
    businessCount: 156,
    featured: ["Artisan Books & Gifts", "Vintage Finds", "Local Threads"],
  },
  {
    id: "services",
    name: "Services",
    description: "Professional services and home maintenance experts",
    icon: "🛠️",
    color: "oklch(0.6 0.15 280)",
    businessCount: 189,
    featured: ["Quick Fix Handyman", "Downtown Legal", "Spark Electric"],
  },
  {
    id: "health-wellness",
    name: "Health & Wellness",
    description: "Gyms, spas, salons, and healthcare providers",
    icon: "💪",
    color: "oklch(0.65 0.14 145)",
    businessCount: 98,
    featured: ["Wellness Hub Spa", "Urban Fitness Studio", "Mindful Yoga"],
  },
  {
    id: "arts-culture",
    name: "Arts & Culture",
    description: "Galleries, theaters, museums, and creative studios",
    icon: "🎨",
    color: "oklch(0.75 0.18 85)",
    businessCount: 67,
    featured: ["The Craft Workshop", "Community Gallery", "Indie Theater"],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    description: "Arcades, bowling, cinemas, and live venues",
    icon: "🎭",
    color: "oklch(0.65 0.2 320)",
    businessCount: 45,
    featured: ["Retro Arcade", "Comedy Club", "Jazz Lounge"],
  },
];

export default function CategoriesPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">
                  Browse by Category
                </h1>
              </div>
              <p className="text-muted-foreground">
                Explore local businesses organized by category
              </p>
            </div>
          </AnimatedSection>

          {/* Categories Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((category, index) => (
              <AnimatedSection
                key={category.id}
                animation="fade-up"
                delay={0.1 * (index + 1)}
              >
                <NavLink href={`/discover?category=${category.id}`}>
                  <Card className="h-full card-lift cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div
                          className="text-5xl"
                          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
                        >
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                            {category.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {category.description}
                          </p>
                          <p className="text-sm font-medium text-primary mb-3">
                            {category.businessCount} businesses
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Featured:</p>
                            <div className="flex flex-wrap gap-1">
                              {category.featured.map((business) => (
                                <span
                                  key={business}
                                  className="text-xs bg-muted px-2 py-0.5 rounded"
                                >
                                  {business}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Explore {category.name.toLowerCase()}
                        </span>
                        <Button variant="ghost" size="sm" className="group/btn">
                          View All
                          <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </NavLink>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
