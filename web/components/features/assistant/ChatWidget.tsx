"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "@/hooks/useLocation";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { ChatMessage, type AssistantChatMessage } from "./ChatMessage";

const WELCOME_TEXT =
  "Hi there! I'm your Pulse local guide — ask me for nearby food, shops, or services.";

const CHAT_SIZE_KEY = "pulse-chat-size";
const DEFAULT_SIZE = { width: 380, height: 600 };

function clampSize(width: number, height: number) {
  const maxWidth =
    typeof window !== "undefined" ? Math.min(680, window.innerWidth - 32) : 680;
  const maxHeight =
    typeof window !== "undefined" ? Math.max(420, window.innerHeight - 96) : 800;
  return {
    width: Math.round(Math.min(Math.max(width, 320), maxWidth)),
    height: Math.round(Math.min(Math.max(height, 420), maxHeight)),
  };
}

function loadStoredSize() {
  try {
    const raw = window.localStorage.getItem(CHAT_SIZE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.width === "number" && typeof parsed?.height === "number") {
        return clampSize(parsed.width, parsed.height);
      }
    }
  } catch {
    // Ignore storage failures — fall back to the default size.
  }
  return DEFAULT_SIZE;
}

function createWelcomeMessage(): AssistantChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: WELCOME_TEXT,
    timestamp: new Date(),
  };
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    createWelcomeMessage(),
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  // Panel size — user-resizable via the top-left grip, persisted per device.
  const [size, setSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    setSize(loadStoredSize());
  }, []);

  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = size;

    const onMove = (ev: PointerEvent) => {
      // Anchored bottom-right: dragging the grip up/left grows the panel.
      setSize(
        clampSize(start.width + (startX - ev.clientX), start.height + (startY - ev.clientY))
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setSize((current) => {
        try {
          window.localStorage.setItem(CHAT_SIZE_KEY, JSON.stringify(current));
        } catch {
          // Ignore storage failures.
        }
        return current;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSentRef = useRef<string | null>(null);
  const messageIdRef = useRef(0);
  const { location } = useLocation();

  const nextMessageId = (suffix: string) => {
    messageIdRef.current += 1;
    return `msg-${messageIdRef.current}-${suffix}`;
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const id = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // ESC closes the panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: AssistantChatMessage = {
      id: nextMessageId("user"),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    lastSentRef.current = text;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages
            .filter((m) => !m.error)
            .map((m) => ({ role: m.role, content: m.content })),
          location: location
            ? { lat: location.lat, lng: location.lng }
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Assistant request failed");
      }

      const data = await response.json();

      const assistantMessage: AssistantChatMessage = {
        id: nextMessageId("assistant"),
        role: "assistant",
        content: typeof data.text === "string" ? data.text : "",
        suggestions: Array.isArray(data.suggestions)
          ? data.suggestions.filter(
              (s: unknown): s is string => typeof s === "string"
            )
          : undefined,
        degraded: data.degraded === true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: AssistantChatMessage = {
        id: nextMessageId("error"),
        role: "assistant",
        content:
          "I couldn't reach the assistant just now. Check your connection and give it another go.",
        error: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastSentRef.current && !isLoading) {
      void handleSend(lastSentRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([createWelcomeMessage()]);
    lastSentRef.current = null;
    setShowSuggestions(true);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
            data-tour="chat-launcher"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              aria-label="Open Pulse Assistant"
              className="h-12 w-12 rounded-xl border border-border shadow-sm transition-shadow hover:shadow-md"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-3rem)]"
            style={{ width: size.width, height: size.height }}
          >
            <div
              role="dialog"
              aria-label="Pulse Assistant"
              className="relative bg-background border border-border rounded-xl shadow-lg overflow-hidden flex h-full flex-col"
            >
              {/* Resize grip — drag the top-left corner to grow/shrink */}
              <div
                role="separator"
                aria-label="Resize chat window"
                title="Drag to resize"
                onPointerDown={handleResizeStart}
                className="absolute left-0 top-0 z-10 h-5 w-5 cursor-nwse-resize rounded-tl-xl border-l-2 border-t-2 border-primary-foreground/50 hover:border-primary-foreground"
              />
              {/* Header */}
              <div className="bg-primary p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-primary-foreground/15 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-foreground">
                      Pulse Assistant
                    </h3>
                    <p className="text-xs text-primary-foreground/80">
                      Local guide
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearChat}
                    className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/15"
                  >
                    Clear
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close Pulse Assistant"
                    className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/15"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4 space-y-3">
                  {messages.map((message, index) => {
                    const isLatest = index === messages.length - 1;
                    const showChips =
                      isLatest &&
                      !isLoading &&
                      message.role === "assistant" &&
                      !message.error &&
                      !!message.suggestions?.length;

                    return (
                      <div key={message.id} className="space-y-2">
                        <ChatMessage
                          message={message}
                          onRetry={message.error ? handleRetry : undefined}
                        />
                        {showChips && (
                          <div className="flex flex-wrap gap-1.5">
                            {message.suggestions?.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => void handleSend(suggestion)}
                                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div
                      role="status"
                      className="flex items-center gap-2 text-muted-foreground"
                    >
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}

                  {showSuggestions && messages.length <= 1 && (
                    <SuggestedQuestions
                      onSelect={(question) => void handleSend(question)}
                    />
                  )}

                  <div ref={scrollEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border bg-secondary/50">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about local businesses..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    aria-label="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  AI-generated responses. Verify important information.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
