"use client";

/**
 * Suggested Questions Component
 *
 * Shows quick question buttons for the user to get started.
 * Selecting a question sends it immediately via the onSelect callback.
 */

import { useState } from "react";
import { Heart, MapPin, HelpCircle, Zap, TrendingUp } from "lucide-react";
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
    questions: [
      "Find me a quiet coffee shop with WiFi",
      "What are the best family-friendly restaurants?",
      "Show me unique local gift shops",
    ],
  },
  {
    id: "impact",
    name: "Impact",
    icon: TrendingUp,
    questions: [
      "How does supporting local help my community?",
      "What is the local multiplier effect?",
      "Why should I choose local over chains?",
    ],
  },
  {
    id: "features",
    name: "Features",
    icon: Zap,
    questions: [
      "How do missions work?",
      "What happens when I bookmark a business?",
      "How do I claim a deal?",
    ],
  },
] as const;

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  const [activeCategory, setActiveCategory] = useState<string>("discovery");

  const activeCategoryData =
    CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];

  return (
    <div className="mt-4 pt-4 border-t border-border">
      {/* Category Tabs */}
      <div className="flex gap-1 mb-3">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              activeCategory === category.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <category.icon className="h-3 w-3" aria-hidden="true" />
            {category.name}
          </button>
        ))}
      </div>

      {/* Question Buttons */}
      <div className="space-y-2">
        {activeCategoryData.questions.map((question) => (
          <Button
            key={question}
            variant="outline"
            size="sm"
            onClick={() => onSelect(question)}
            className="w-full justify-start text-left h-auto py-2 px-3 text-sm font-normal hover:border-primary/40"
          >
            <activeCategoryData.icon
              className="h-3.5 w-3.5 mr-2 flex-shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
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
          <Heart className="h-3 w-3 mr-1" aria-hidden="true" />
          How we pick
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelect("What can you help me with?")}
          className="flex-1 text-xs text-muted-foreground"
        >
          <HelpCircle className="h-3 w-3 mr-1" aria-hidden="true" />
          Help
        </Button>
      </div>
    </div>
  );
}
