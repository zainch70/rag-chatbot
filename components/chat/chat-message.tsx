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
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}
