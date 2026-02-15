"use client";

/**
 * Suggested Questions Component
 *
 * Shows quick question buttons for the user to get started
 */

import { useState, useEffect } from "react";
import { Coffee, Heart, MapPin, HelpCircle, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const CATEGORIES = [
  {
    id: "discovery",
    name: "Discover",
    icon: MapPin,
    color: "bg-chart-2",
    questions: [
      "Find me a quiet coffee shop with WiFi",
      "What are the best family-friendly restaurants?",
      "Show me unique local gift shops",
      "Where can I find a good brunch spot?",
    ],
  },
  {
    id: "impact",
    name: "Impact",
    icon: TrendingUp,
    color: "bg-chart-3",
    questions: [
      "How does supporting local help my community?",
      "What is the local multiplier effect?",
      "How much impact have I made?",
      "Why should I choose local over chains?",
    ],
  },
  {
    id: "features",
    name: "Features",
    icon: Zap,
    color: "bg-chart-4",
    questions: [
      "How do Boost Missions work?",
      "What happens when I bookmark a business?",
      "How is my impact score calculated?",
      "How do I claim a deal?",
    ],
  },
];

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  const [activeCategory, setActiveCategory] = useState("discovery");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const category = CATEGORIES.find((c) => c.id === activeCategory);
    setSuggestions(category?.questions.slice(0, 3) || []);
  }, [activeCategory]);

  const activeCategoryData = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="mt-4 pt-4 border-t">
      {/* Category Tabs */}
      <div className="flex gap-1 mb-3">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              activeCategory === category.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <category.icon className="h-3 w-3" />
            {category.name}
          </button>
        ))}
      </div>

      {/* Question Buttons */}
      <div className="space-y-2">
        {suggestions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(question)}
            className="w-full justify-start text-left h-auto py-2 px-3 text-sm font-normal hover:bg-primary/5 hover:border-primary/30"
          >
            {activeCategoryData && (
              <activeCategoryData.icon
                className={cn(
                  "h-3.5 w-3.5 mr-2 flex-shrink-0",
                  activeCategory === "discovery" && "text-chart-2",
                  activeCategory === "impact" && "text-chart-3",
                  activeCategory === "features" && "text-chart-4"
                )}
              />
            )}
            <span className="line-clamp-1">{question}</span>
          </Button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelect("Tell me about Pulse")}
          className="flex-1 text-xs text-muted-foreground"
        >
          <Heart className="h-3 w-3 mr-1" />
          Our Mission
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelect("What can you help me with?")}
          className="flex-1 text-xs text-muted-foreground"
        >
          <HelpCircle className="h-3 w-3 mr-1" />
          Help
        </Button>
      </div>
    </div>
  );
}
