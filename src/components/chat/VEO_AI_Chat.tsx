"use client";

import { ArrowClockwise, PaperPlaneRight } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ChatClientMessage, PublicVeoSource } from "@/lib/ai/types";

export type VEO_AI_ChatProps = {
  suggestedPrompts: readonly string[];
};

const EMPTY_STATE_MESSAGE =
  "No VEO AI sources are loaded yet. Create VEO actions or add track comments, then ask a focused question.";
const FALLBACK_ERROR_MESSAGE =
  "VEO AI is temporarily unavailable. Try again.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractErrorMessage(payload: unknown): string | null {
  if (
    isRecord(payload) &&
    typeof payload.error === "string" &&
    payload.error.length > 0 &&
    payload.error.length <= 300
  ) {
    return payload.error;
  }
  return null;
}

function extractAnswer(payload: unknown): string | null {
  if (
    isRecord(payload) &&
    typeof payload.answer === "string" &&
    payload.answer.trim().length > 0
  ) {
    return payload.answer;
  }
  return null;
}

function isPublicSource(value: unknown): value is PublicVeoSource {
  return (
    isRecord(value) &&
    (value.kind === "action" || value.kind === "comment") &&
    typeof value.label === "string" &&
    typeof value.context === "string"
  );
}

function extractSources(payload: unknown): PublicVeoSource[] {
  if (!isRecord(payload) || !Array.isArray(payload.sources)) return [];
  return payload.sources.filter(isPublicSource).slice(0, 8);
}

export function VEO_AI_Chat({ suggestedPrompts }: VEO_AI_ChatProps) {
  const [messages, setMessages] = useState<ChatClientMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryMessages, setRetryMessages] = useState<ChatClientMessage[] | null>(
    null,
  );
  const [sources, setSources] = useState<PublicVeoSource[]>([]);

  const shouldReduceMotion = useReducedMotion();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const wasSendingRef = useRef(false);

  useEffect(() => {
    if (wasSendingRef.current && !isSending) {
      textareaRef.current?.focus();
    }
    wasSendingRef.current = isSending;
  }, [isSending]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      block: "end",
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  }, [messages, isSending, shouldReduceMotion]);

  // One send path for submits and retries: the exact requestMessages array is
  // used for optimistic state, the POST body, and retryMessages — never rebuilt.
  const send = useCallback(
    async (requestMessages: ChatClientMessage[]): Promise<boolean> => {
      setIsSending(true);
      setError(null);
      setMessages(requestMessages);

      try {
        const response = await fetch("/api/veo-ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: requestMessages }),
          cache: "no-store",
        });
        const payload: unknown = await response.json().catch(() => null);

        const answer = response.ok ? extractAnswer(payload) : null;
        if (!response.ok || answer === null) {
          setError(extractErrorMessage(payload) ?? FALLBACK_ERROR_MESSAGE);
          setMessages(requestMessages.slice(0, -1));
          return false;
        }

        setMessages([...requestMessages, { role: "assistant", content: answer }]);
        setSources(extractSources(payload));
        setRetryMessages(null);
        return true;
      } catch {
        setError(FALLBACK_ERROR_MESSAGE);
        setMessages(requestMessages.slice(0, -1));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    const content = draft.trim();
    if (!content || isSending) return;

    const userMessage: ChatClientMessage = { role: "user", content };
    const requestMessages = [...messages, userMessage];
    setRetryMessages(requestMessages);

    const succeeded = await send(requestMessages);
    if (succeeded) {
      setDraft("");
    }
  }, [draft, isSending, messages, send]);

  const handleRetry = useCallback(async () => {
    if (!retryMessages || isSending) return;
    await send(retryMessages);
  }, [isSending, retryMessages, send]);

  const applyPrompt = useCallback(
    (prompt: string) => {
      if (isSending) return;
      setDraft(prompt);
      textareaRef.current?.focus();
    },
    [isSending],
  );

  const canSend = draft.trim().length > 0 && !isSending;
  const showEmptyState = messages.length === 0 && !isSending;

  return (
    <div className="grid w-full max-w-3xl gap-5">
      {suggestedPrompts.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
          {suggestedPrompts.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                onClick={() => applyPrompt(prompt)}
                disabled={isSending}
                className="rounded-full border border-border bg-white/5 px-3 py-1.5 text-xs text-muted-foreground outline-none transition-colors hover:border-primary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        aria-live="polite"
        aria-busy={isSending}
        className="glass-panel grid gap-4 p-4 sm:p-6"
      >
        {showEmptyState ? (
          <p className="text-sm text-muted-foreground">{EMPTY_STATE_MESSAGE}</p>
        ) : null}

        {messages.length > 0 ? (
          <ol className="grid gap-4">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const isLast = index === messages.length - 1;
              return (
                <motion.li
                  key={`${message.role}-${index}`}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    shouldReduceMotion ? { duration: 0 } : { duration: 0.18 }
                  }
                  className={`grid gap-1 ${isUser ? "justify-items-end" : "justify-items-start"}`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {isUser ? "You" : "VEO AI"}
                  </span>
                  <p
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                      isUser
                        ? "bg-primary-container/25 text-foreground"
                        : "border border-border bg-white/5 text-foreground"
                    }`}
                  >
                    {message.content}
                  </p>
                  {!isUser && isLast && sources.length > 0 ? (
                    <div className="mt-1 grid max-w-[85%] gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Sources
                      </span>
                      <ul className="flex flex-wrap gap-2">
                        {sources.map((source, sourceIndex) => (
                          <li
                            key={`${source.kind}-${sourceIndex}`}
                            className="rounded-full border border-border bg-white/5 px-3 py-1 text-xs text-foreground"
                          >
                            <span className="font-medium">{source.label}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              · {source.context}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </motion.li>
              );
            })}
          </ol>
        ) : null}

        {isSending ? (
          <p role="status" className="text-sm text-muted-foreground">
            VEO AI is thinking…
          </p>
        ) : null}

        {error ? (
          <div className="grid gap-2">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            {retryMessages ? (
              <div>
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isSending}
                >
                  <ArrowClockwise aria-hidden="true" size={14} />
                  Retry
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div ref={endRef} aria-hidden="true" />
      </div>

      <form
        className="grid gap-3"
        aria-label="Ask VEO AI"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="grid gap-2">
          <label htmlFor="veo-ai-composer" className="text-sm font-medium">
            Message VEO AI
          </label>
          <textarea
            id="veo-ai-composer"
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) void handleSubmit();
              }
            }}
            rows={3}
            maxLength={4000}
            disabled={isSending}
            placeholder="Ask about VEO actions or track comments…"
            className="w-full resize-y rounded-[10px] border border-input bg-background/50 px-3 py-2 text-sm text-foreground shadow-inner shadow-black/5 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          />
        </div>
        <div>
          <Button type="submit" disabled={!canSend}>
            <PaperPlaneRight aria-hidden="true" size={16} />
            {isSending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
