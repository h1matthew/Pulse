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
}

const HOW_IT_WORKS_STEPS: HelpStep[] = [
  {
    icon: Store,
    title: "Discover",
    description:
      "Browse local businesses near you. Filter by category, sort by rating, or search by name.",
  },
  {
    icon: Star,
    title: "Review",
    description:
      "Leave reviews and ratings. Bot prevention keeps review forms gated.",
  },
  {
    icon: Heart,
    title: "Bookmark",
    description:
      "Save businesses to a personal list.",
  },
  {
    icon: Tag,
    title: "Claim deals",
    description:
      "Claim current offers and get a redemption code.",
  },
  {
    icon: Zap,
    title: "Complete missions",
    description:
      'Take on challenges like "Try 3 new coffee shops this month" and earn rewards.',
  },
  {
    icon: TrendingUp,
    title: "Track the ledger",
    description:
      "See receipt-based totals, estimated dollars kept local, and progress.",
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
            compact && "gap-1.5 h-7 px-2 font-mono text-meta"
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
          <DialogTitle className="flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-primary" />
            How Pulse works
          </DialogTitle>
          <DialogDescription id="help-menu-description">
            Browse local businesses and track verified check-ins.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 -mx-4 px-4">
          {/* How It Works Steps */}
          <div className="space-y-1">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <div
                key={step.title}
                className="flex items-start gap-2 rounded-md p-1.5 transition-colors hover:bg-surface-3"
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-surface-3 text-text-tertiary">
                  <step.icon className="h-3 w-3" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-meta text-text-tertiary">
                      Step {index + 1}
                    </span>
                    <h3 className="text-small font-medium">{step.title}</h3>
                  </div>
                  <p className="text-small leading-snug text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Keyboard Shortcuts */}
          <div className="mt-2 border-t border-border pt-2">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-small font-medium">
              <Keyboard className="h-3 w-3 text-muted-foreground" />
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-1">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center gap-1.5 text-small"
                >
                  <kbd className="rounded-xs border border-border px-1.5 py-0.5 font-mono text-meta">
                    {shortcut.key}
                  </kbd>
                  <span className="text-muted-foreground">
                    {shortcut.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Assistant tip */}
          <div className="mt-2 rounded-md border border-border bg-surface-2 p-2">
            <div className="flex items-start gap-1.5">
              <MessageCircle className="mt-0.5 h-3 w-3 text-text-tertiary" aria-hidden="true" />
              <div>
                <p className="text-small font-medium">Need more help?</p>
                <p className="text-small leading-snug text-muted-foreground">
                  Use the assistant to ask questions or get recommendations.
                </p>
              </div>
            </div>
          </div>

          {/* Restart Tour Button */}
          <div className="mt-2 border-t border-border pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
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
              Restart tour
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
