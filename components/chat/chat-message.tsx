"use client";

import Markdown from "react-markdown";

import { cn } from "@/lib/utils";

export type ChatMessageData = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatMessage({
  message,
}: {
  message: ChatMessageData;
}) {
  const isUser = message.role === "user";
  const isPendingAssistant = !isUser && !message.content.trim();

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 sm:max-w-[78%]",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border/60 bg-background text-foreground"
        )}
      >
        {isPendingAssistant ? (
          <div className="flex items-center gap-1.5 py-0.5 text-muted-foreground">
            <span className="inline-flex size-1.5 animate-pulse rounded-full bg-foreground/35" />
            <span className="inline-flex size-1.5 animate-pulse rounded-full bg-foreground/35 [animation-delay:120ms]" />
            <span className="inline-flex size-1.5 animate-pulse rounded-full bg-foreground/35 [animation-delay:240ms]" />
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="chat-markdown">
            <Markdown
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0 whitespace-pre-wrap">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="leading-6">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {children}
                  </a>
                ),
                h1: ({ children }) => (
                  <h1 className="mb-2 text-base font-semibold">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-2 text-sm font-semibold">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 text-sm font-semibold">{children}</h3>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
