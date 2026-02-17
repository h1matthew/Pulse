"use client";

import { useState } from "react";
import {
  HelpCircle,
  Store,
  Star,
  Heart,
  Tag,
  TrendingUp,
  Zap,
  MessageCircle,
  Keyboard,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface HelpStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}

const HOW_IT_WORKS_STEPS: HelpStep[] = [
  {
    icon: Store,
    title: "Discover",
    description:
      "Browse real local businesses near you powered by Google Places. Filter by category, sort by rating, or search by name.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Star,
    title: "Review & Rate",
    description:
      "Leave honest reviews and ratings to help others find the best local spots. Bot prevention keeps reviews authentic.",
    color: "bg-chart-5/10 text-chart-5",
  },
  {
    icon: Heart,
    title: "Bookmark Favorites",
    description:
      "Save businesses you love to your personal list. Build your collection of local go-to spots.",
    color: "bg-chart-2/10 text-chart-2",
  },
  {
    icon: Tag,
    title: "Claim Deals",
    description:
      "Access exclusive deals and discounts from local businesses. Get a unique redemption code for each deal.",
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    icon: Zap,
    title: "Complete Missions",
    description:
      'Take on "Boost Missions" like "Try 3 new coffee shops this month" and earn rewards for your community engagement.',
    color: "bg-chart-4/10 text-chart-4",
  },
  {
    icon: TrendingUp,
    title: "Track Your Impact",
    description:
      "See exactly how your support strengthens the local economy — dollars kept local, jobs supported, and more.",
    color: "bg-primary/10 text-primary",
  },
];

const KEYBOARD_SHORTCUTS = [
  { key: "Tab", description: "Navigate between elements" },
  { key: "Enter", description: "Activate buttons and links" },
  { key: "Esc", description: "Close dialogs and menus" },
  { key: "/", description: "Focus search (on Discover page)" },
];

interface HelpMenuProps {
  compact?: boolean;
}

export function HelpMenu({ compact = false }: HelpMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "icon"}
          aria-label="Open help menu"
          className={cn(
            "text-muted-foreground hover:text-foreground",
            compact && "gap-1.5 h-7 rounded-full px-2 text-xs"
          )}
        >
          <HelpCircle
            className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")}
          />
          {!compact && <span className="sr-only">Help</span>}
          {compact && <span className="hidden xl:inline">Help</span>}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-sm max-h-[60vh] flex flex-col overflow-hidden p-4"
        aria-describedby="help-menu-description"
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <HelpCircle className="h-4 w-4 text-primary" />
            How Pulse Works
          </DialogTitle>
          <DialogDescription id="help-menu-description" className="text-xs">
            Discover and support local businesses while tracking your impact.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 -mx-4 px-4">
          {/* How It Works Steps */}
          <div className="space-y-1">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <div
                key={step.title}
                className="flex items-start gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0",
                    step.color
                  )}
                >
                  <step.icon className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Step {index + 1}
                    </span>
                    <h3 className="font-semibold text-xs">{step.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Keyboard Shortcuts */}
          <div className="pt-2 mt-2 border-t">
            <h3 className="font-semibold text-xs flex items-center gap-1.5 mb-1.5">
              <Keyboard className="h-3 w-3 text-muted-foreground" />
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-1">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                    {shortcut.key}
                  </kbd>
                  <span className="text-muted-foreground">
                    {shortcut.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Assistant tip */}
          <div className="mt-2 p-2 bg-primary/5 rounded-md border border-primary/10">
            <div className="flex items-start gap-1.5">
              <MessageCircle className="h-3 w-3 text-primary mt-0.5" />
              <div>
                <p className="text-xs font-medium">Need more help?</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Use the AI Assistant (chat bubble in the bottom-right) to ask
                  questions or get recommendations.
                </p>
              </div>
            </div>
          </div>

          {/* Restart Tour Button */}
          <div className="mt-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5"
              onClick={() => {
                // Close help menu
                setOpen(false);
                // Trigger tour restart (exposed by OnboardingTour)
                setTimeout(() => {
                  const win = window as Window & { restartPulseTour?: () => void };
                  win.restartPulseTour?.();
                }, 300);
              }}
            >
              <Play className="h-3 w-3" />
              Restart Onboarding Tour
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
