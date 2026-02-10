"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, MapPin, Star, Heart } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_FILTERS, SORT_OPTIONS } from "@/lib/constants/navigation";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { NavLink } from "@/components/ui/nav-link";

// Sample business data
const SAMPLE_BUSINESSES = [
  {
    id: "1",
    name: "The Local Bean",
    category: "food-drink",
    categoryName: "Food & Drink",
    description: "Cozy local coffee shop with homemade pastries",
    address: "123 Main Street, Downtown",
    rating: 4.7,
    reviewCount: 128,
    priceRange: 2,
    isVerified: true,
    isFeatured: true,
    image: "☕",
    tags: ["Coffee", "Pastries", "Wifi"],
  },
  {
    id: "2",
    name: "Artisan Books & Gifts",
    category: "retail",
    categoryName: "Retail",
    description: "Independent bookstore with local authors",
    address: "456 Oak Avenue, Downtown",
    rating: 4.9,
    reviewCount: 89,
    priceRange: 2,
    isVerified: true,
    isFeatured: true,
    image: "📚",
    tags: ["Books", "Gifts", "Events"],
  },
  {
    id: "3",
    name: "Wellness Hub Spa",
    category: "health-wellness",
    categoryName: "Health & Wellness",
    description: "Organic spa with locally sourced products",
    address: "789 Wellness Way, Downtown",
    rating: 4.6,
    reviewCount: 64,
    priceRange: 3,
    isVerified: true,
    isFeatured: false,
    image: "💆",
    tags: ["Spa", "Massage", "Organic"],
  },
  {
    id: "4",
    name: "Corner Bistro",
    category: "food-drink",
    categoryName: "Food & Drink",
    description: "Farm-to-table restaurant with seasonal menu",
    address: "321 Elm Street, Midtown",
    rating: 4.5,
    reviewCount: 213,
    priceRange: 3,
    isVerified: true,
    isFeatured: false,
    image: "🍽️",
    tags: ["Farm-to-table", "Dinner", "Local"],
  },
  {
    id: "5",
    name: "Urban Fitness Studio",
    category: "health-wellness",
    categoryName: "Health & Wellness",
    description: "Boutique fitness classes and personal training",
    address: "555 Fitness Blvd, Uptown",
    rating: 4.8,
    reviewCount: 156,
    priceRange: 3,
    isVerified: true,
    isFeatured: false,
    image: "💪",
    tags: ["Fitness", "Classes", "Training"],
  },
  {
    id: "6",
    name: "The Craft Workshop",
    category: "arts-culture",
    categoryName: "Arts & Culture",
    description: "DIY workshops and artisan supplies",
    address: "888 Creative Lane, Arts District",
    rating: 4.4,
    reviewCount: 72,
    priceRange: 2,
    isVerified: true,
    isFeatured: false,
    image: "🎨",
    tags: ["Workshops", "Crafts", "Supplies"],
  },
];

export default function DiscoverPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBusinesses = SAMPLE_BUSINESSES.filter((business) => {
    const matchesCategory =
      selectedCategory === "all" || business.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getPriceRange = (level: number) => "$".repeat(level);

  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-8">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Discover Local Businesses
            </h1>
            <p className="text-muted-foreground mb-6">
              Find and support amazing local businesses in your community
            </p>
          </AnimatedSection>

          {/* Search and Filters */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search businesses..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </AnimatedSection>

          {/* Category Filters */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              {CATEGORY_FILTERS.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap"
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.name}
                </Button>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Business Grid */}
      <section className="relative px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up" delay={0.2}>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                Showing {filteredBusinesses.length} businesses
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((business, index) => (
              <AnimatedSection
                key={business.id}
                animation="fade-up"
                delay={0.1 * (index + 3)}
              >
                <NavLink href={`/business/${business.id}`}>
                  <Card className="h-full card-lift cursor-pointer group">
                    <CardContent className="p-0">
                      {/* Image Placeholder */}
                      <div className="h-40 bg-gradient-to-br from-primary/10 to-chart-2/10 flex items-center justify-center text-6xl relative">
                        {business.image}
                        {business.isFeatured && (
                          <Badge className="absolute top-3 left-3 bg-chart-2 text-white">
                            Featured
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-3 right-3 bg-background/80 hover:bg-background"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Heart className="h-4 w-4" />
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
                              {business.categoryName}
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

                        <div className="flex flex-wrap gap-1">
                          {business.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </NavLink>
              </AnimatedSection>
            ))}
          </div>

          {filteredBusinesses.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">No businesses found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
