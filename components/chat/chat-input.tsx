"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatInput({
  disabled = false,
  onSend,
}: {
  disabled?: boolean;
  onSend: (message: string) => Promise<void> | void;
}) {
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled) {
      return;
    }

    await onSend(trimmedMessage);
    setMessage("");
  };

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await handleSubmit();
      }}
    >
      <Input
        placeholder={
          disabled ? "Chat is unavailable right now..." : "Ask something..."
        }
        value={message}
        disabled={disabled}
        className="h-11 flex-1 rounded-2xl border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
        onChange={(event) => setMessage(event.target.value)}
      />

      <Button
        type="submit"
        size="icon"
        className="size-10 shrink-0 rounded-xl"
        disabled={disabled || !message.trim()}
        aria-label="Send message"
      >
        <Send />
      </Button>
    </form>
  );
}
