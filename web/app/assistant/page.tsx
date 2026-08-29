"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Header } from "@/components/layout/Header";
import { ChatMessage } from "@/components/features/assistant/ChatMessage";
import { useLocation } from "@/hooks/useLocation";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = {
  discovery: [
    "Find me a quiet coffee shop with WiFi",
    "Show family-friendly restaurants nearby",
    "Show me unique local gift shops",
    "Find a brunch spot",
    "Find a local bookstore",
  ],
  impact: [
    "How does local spending get counted?",
    "What is the local multiplier effect?",
    "How much have I kept local?",
    "Why should I choose local over chains?",
    "How do check-ins affect my ledger?",
  ],
  features: [
    "How do missions work?",
    "What happens when I bookmark a business?",
    "How is my impact score calculated?",
    "How do I claim a deal?",
    "What does a check-in record?",
  ],
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageIdRef = useRef(0);
  const { location } = useLocation();

  const nextMessageId = (suffix: string) => {
    messageIdRef.current += 1;
    return `message-${messageIdRef.current}-${suffix}`;
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    if (!messageText) {
      setInput("");
    }

    const userMessage: Message = {
      id: nextMessageId("user"),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setHasStarted(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          location: location
            ? { lat: location.lat, lng: location.lng }
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: nextMessageId("assistant"),
        role: "assistant",
        content: data.text,
        suggestions: data.suggestions,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: nextMessageId("error"),
        role: "assistant",
        content:
          "I can't reach the assistant right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setHasStarted(false);
  };

  return (
    <div className="relative min-h-screen">
      <Header />

      <div className="pt-16 pb-8 h-[calc(100vh-4rem)]">
        <div className="mx-auto max-w-6xl px-6 h-full">
          <div className="grid h-full gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            {/* Main Chat Area */}
            <div className="flex flex-col h-full">
              {!hasStarted ? (
                // Welcome screen — left-aligned, no centered body copy
                <div className="flex flex-1 flex-col justify-end pb-6">
                  <motion.h1
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-h2 font-medium"
                  >
                    Pulse Assistant
                  </motion.h1>

                  <motion.p
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="mt-1.5 max-w-lg text-small text-muted-foreground"
                  >
                    Ask about local businesses near you, how missions and deals
                    work, or what your check-ins add up to.
                  </motion.p>

                  <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-5 flex flex-wrap gap-2"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleSend(
                          "Find me a quiet coffee shop with WiFi for working"
                        )
                      }
                    >
                      Find a coffee shop
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleSend("How does local spending get counted?")
                      }
                    >
                      Learn about impact
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSend("How do missions work?")}
                    >
                      Missions
                    </Button>
                  </motion.div>
                </div>
              ) : (
                // Chat Messages
                <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                  <div className="space-y-6 py-4">
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ChatMessage message={message} />

                        {/* Show suggestions after assistant messages */}
                        {message.role === "assistant" &&
                          message.suggestions &&
                          index === messages.length - 1 && (
                            <div className="flex flex-wrap gap-2 mt-3 ml-11">
                              {message.suggestions
                                .slice(0, 3)
                                .map((suggestion, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleSend(suggestion)}
                                    className="rounded-md border border-border px-2.5 py-1 text-meta text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                            </div>
                          )}
                      </motion.div>
                    ))}

                    {isLoading && (
                      <div className="flex items-center gap-3 text-muted-foreground ml-11">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Input Area */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex gap-3">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about places, deals, or your ledger..."
                    aria-label="Ask the Pulse assistant a question"
                    className="flex-1 h-12"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    size="lg"
                    className="h-12 px-6"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {hasStarted && (
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-muted-foreground">
                      Verify important information before visiting.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearChat}
                      className="text-xs"
                    >
                      Start new chat
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block">
              <h2 className="mb-3 text-h3 font-medium">Suggested questions</h2>
              <div className="divide-y divide-border border-y border-border">
                {[
                  { label: "Discover", items: SUGGESTED_QUESTIONS.discovery.slice(0, 3) },
                  { label: "Impact", items: SUGGESTED_QUESTIONS.impact.slice(0, 3) },
                  { label: "Features", items: SUGGESTED_QUESTIONS.features.slice(0, 2) },
                ].map((group) => (
                  <div key={group.label} className="py-3">
                    <p className="font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                      {group.label}
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {group.items.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSend(q)}
                          className="w-full rounded-md px-2 py-1 text-left text-small text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/discover"
                className="mt-3 inline-flex items-center gap-1 font-mono text-meta text-text-tertiary hover:text-primary"
              >
                Browse the directory
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
