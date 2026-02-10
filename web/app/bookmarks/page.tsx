"use client";

import { Heart, MapPin, Star, Trash2, ExternalLink } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { NavLink } from "@/components/ui/nav-link";

const BOOKMARKED_BUSINESSES = [
  {
    id: "1",
    name: "The Local Bean",
    category: "Food & Drink",
    description: "Cozy local coffee shop with homemade pastries",
    address: "123 Main Street, Downtown",
    rating: 4.7,
    reviewCount: 128,
    priceRange: 2,
    isVerified: true,
    image: "☕",
    tags: ["Coffee", "Pastries", "Wifi"],
    bookmarkedAt: "2 weeks ago",
    note: "Great for working remotely!",
  },
  {
    id: "2",
    name: "Artisan Books & Gifts",
    category: "Retail",
    description: "Independent bookstore with local authors",
    address: "456 Oak Avenue, Downtown",
    rating: 4.9,
    reviewCount: 89,
    priceRange: 2,
    isVerified: true,
    image: "📚",
    tags: ["Books", "Gifts", "Events"],
    bookmarkedAt: "1 month ago",
    note: "Check out their book club events",
  },
  {
    id: "5",
    name: "Urban Fitness Studio",
    category: "Health & Wellness",
    description: "Boutique fitness classes and personal training",
    address: "555 Fitness Blvd, Uptown",
    rating: 4.8,
    reviewCount: 156,
    priceRange: 3,
    isVerified: true,
    image: "💪",
    tags: ["Fitness", "Classes", "Training"],
    bookmarkedAt: "3 weeks ago",
    note: "",
  },
];

export default function BookmarksPage() {
  const getPriceRange = (level: number) => "$".repeat(level);

  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-6 w-6 text-chart-5" />
                <h1 className="text-3xl font-bold tracking-tight">
                  Your Bookmarks
                </h1>
              </div>
              <p className="text-muted-foreground">
                Businesses you&apos;ve saved to support later
              </p>
            </div>
          </AnimatedSection>

          {/* Stats */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-chart-5/10 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-chart-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {BOOKMARKED_BUSINESSES.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Saved Businesses
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">4.8</div>
                    <div className="text-xs text-muted-foreground">
                      Avg. Rating
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-chart-2/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-chart-2" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">3</div>
                    <div className="text-xs text-muted-foreground">
                      Neighborhoods
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>

          {/* Bookmarks Grid */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {BOOKMARKED_BUSINESSES.map((business, index) => (
                <AnimatedSection
                  key={business.id}
                  animation="fade-up"
                  delay={0.1 * (index + 2)}
                >
                  <Card className="h-full group">
                    <CardContent className="p-0">
                      {/* Image Placeholder */}
                      <div className="h-40 bg-gradient-to-br from-primary/10 to-chart-2/10 flex items-center justify-center text-6xl relative">
                        {business.image}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-3 right-3 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {business.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {business.category}
                            </p>
                          </div>
                          {business.isVerified && (
                            <Badge variant="secondary" className="text-xs">
                              ✓ Verified
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">
                          {business.description}
                        </p>

                        <div className="flex items-center gap-1 mb-3">
                          <Star className="h-4 w-4 fill-chart-5 text-chart-5" />
                          <span className="font-medium">{business.rating}</span>
                          <span className="text-muted-foreground">
                            ({business.reviewCount} reviews)
                          </span>
                          <span className="text-muted-foreground mx-1">•</span>
                          <span className="text-muted-foreground">
                            {getPriceRange(business.priceRange)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                          <MapPin className="h-3 w-3" />
                          {business.address}
                        </div>

                        {business.note && (
                          <div className="p-3 bg-muted rounded-lg mb-3">
                            <p className="text-sm text-muted-foreground italic">
                              &ldquo;{business.note}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1 mb-4">
                          {business.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Saved {business.bookmarkedAt}
                          </span>
                          <NavLink href={`/business/${business.id}`}>
                            <Button size="sm" variant="outline" className="gap-1">
                              View
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </NavLink>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>

          {BOOKMARKED_BUSINESSES.length === 0 && (
            <AnimatedSection animation="fade-up" delay={0.2}>
              <div className="text-center py-16">
                <div className="text-4xl mb-4">💝</div>
                <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start exploring and save businesses you want to support
                </p>
                <NavLink href="/discover">
                  <Button>Discover Businesses</Button>
                </NavLink>
              </div>
            </AnimatedSection>
          )}
        </div>
      </div>
    </div>
  );
}
