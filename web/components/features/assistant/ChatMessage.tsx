/**
 * Chat Message Component
 *
 * Displays a single message in the chat interface.
 * Handles user/assistant alignment, degraded-source notices,
 * and a retry affordance for failed requests.
 */

import { Info, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import 'katex/dist/katex.min.css';

export interface AssistantChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  /** True when the reply came from the database fallback instead of the LLM */
  degraded?: boolean;
  /** True when the request failed and the message is a retry prompt */
  error?: boolean;
  timestamp: Date;
}

interface ChatMessageProps {
  message: AssistantChatMessage;
  /** Resends the last user message; rendered as "Try again" on error messages */
  onRetry?: () => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary border border-border text-foreground"
        )}
      >
        {/* Degraded-source notice — informational, not an error */}
        {message.degraded && (
          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>Quick results from the local directory</span>
          </div>
        )}

        {isUser ? (
          <p className="m-0 whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown
            // singleDollarTextMath off: "$100 ... $68" money talk must never
            // parse as math — formulas use $$...$$ delimiters instead.
            remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
            rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
            components={{
              p: ({ children }) => (
                <p className="m-0 mb-2 last:mb-0 leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="m-0 mb-2 list-disc pl-4 last:mb-0 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="m-0 mb-2 list-decimal pl-4 last:mb-0 space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-0">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              em: ({ children }) => <em className="not-italic text-muted-foreground">{children}</em>,
              code: ({ children }) => (
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
              ),
              h1: ({ children }) => <p className="m-0 mb-1.5 font-semibold">{children}</p>,
              h2: ({ children }) => <p className="m-0 mb-1.5 font-semibold">{children}</p>,
              h3: ({ children }) => <p className="m-0 mb-1.5 font-semibold">{children}</p>,
              table: ({ children }) => (
                <div className="mb-2 overflow-x-auto last:mb-0">
                  <table className="w-full border-collapse text-xs">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border-b border-border px-2 py-1 text-left font-semibold">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border-b border-border/50 px-2 py-1">{children}</td>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-primary underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}

        {/* Retry affordance for failed requests */}
        {message.error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
