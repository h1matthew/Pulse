"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Sparkles,
  Loader2,
  MapPin,
  TrendingUp,
  Zap,
  Heart,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { ChatMessage } from "@/components/features/assistant/ChatMessage";
import { useLocation } from "@/hooks/useLocation";
import { cn } from "@/lib/utils";
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
    "What are the best family-friendly restaurants?",
    "Show me unique local gift shops",
    "Where can I find a good brunch spot?",
    "Recommend me a local bookstore",
  ],
  impact: [
    "How does supporting local businesses help?",
    "What is the local multiplier effect?",
    "How much impact have I made?",
    "Why should I choose local over chains?",
    "How do my check-ins help the community?",
  ],
  features: [
    "How do Boost Missions work?",
    "What happens when I bookmark a business?",
    "How is my impact score calculated?",
    "How do I claim a deal?",
    "What are the benefits of checking in?",
  ],
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { location } = useLocation();

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
      id: Date.now().toString(),
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
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text,
        suggestions: data.suggestions,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm sorry, I'm having trouble connecting right now. Please try again in a moment!",
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
          <div className="grid lg:grid-cols-[1fr,350px] gap-6 h-full">
            {/* Main Chat Area */}
            <div className="flex flex-col h-full">
              {!hasStarted ? (
                // Welcome Screen
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-6"
                  >
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center shadow-lg shadow-primary/25">
                      <Sparkles className="h-10 w-10 text-white" />
                    </div>
                  </motion.div>

                  <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl font-bold mb-3"
                  >
                    Pulse Assistant
                  </motion.h1>

                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-muted-foreground max-w-md mb-8"
                  >
                    Your AI-powered guide to discovering amazing local
                    businesses and understanding your community impact. Ask me
                    anything!
                  </motion.p>

                  {/* Quick Start Buttons */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-3"
                  >
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleSend(
                          "Find me a quiet coffee shop with WiFi for working"
                        )
                      }
                      className="gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      Find a coffee shop
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleSend("How does supporting local help my community?")
                      }
                      className="gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Learn about impact
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSend("How do Boost Missions work?")}
                      className="gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Boost Missions
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
                                    className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
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
                    placeholder="Ask about local businesses, your impact, or how Pulse works..."
                    aria-label="Ask the Pulse AI assistant a question"
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
                      AI-generated responses. Verify important information.
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
            <div className="hidden lg:block space-y-4">
              {/* Suggested Questions Card */}
              <Card className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Suggested Questions
                </h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-chart-2" />
                      Discover
                    </h4>
                    <div className="space-y-1.5">
                      {SUGGESTED_QUESTIONS.discovery.slice(0, 3).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(q)}
                          className="w-full text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1.5 rounded transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-chart-3" />
                      Impact
                    </h4>
                    <div className="space-y-1.5">
                      {SUGGESTED_QUESTIONS.impact.slice(0, 3).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(q)}
                          className="w-full text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1.5 rounded transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-chart-4" />
                      Features
                    </h4>
                    <div className="space-y-1.5">
                      {SUGGESTED_QUESTIONS.features.slice(0, 2).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(q)}
                          className="w-full text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1.5 rounded transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Mission Card */}
              <Card className="p-5 bg-gradient-to-br from-primary/5 to-chart-2/5">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  Our Mission
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  &quot;Powering the Heart of Local Business&quot; — We help you
                  discover and support local businesses while tracking your
                  positive community impact.
                </p>
                <Link href="/discover">
                  <Button variant="outline" size="sm" className="w-full group">
                    Start Exploring
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </Card>

              {/* Stats Card */}
              <Card className="p-5">
                <h3 className="font-semibold mb-3">Why Local Matters</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Money kept local
                    </span>
                    <span className="font-medium text-chart-3">~68%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Economic multiplier
                    </span>
                    <span className="font-medium text-chart-2">2-4x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      US jobs from small biz
                    </span>
                    <span className="font-medium text-chart-4">47.1%</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
