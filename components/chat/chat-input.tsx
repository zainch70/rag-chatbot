"use client";

import { Loader2, Send } from "lucide-react";
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
      className="flex gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await handleSubmit();
      }}
    >
      <Input
        placeholder="Ask about your documents..."
        value={message}
        disabled={disabled}
        className="h-10"
        onChange={(event) => setMessage(event.target.value)}
      />

      <Button
        type="submit"
        size="icon"
        className="shrink-0"
        disabled={disabled || !message.trim()}
        aria-label="Send message"
      >
        {disabled ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Send />
        )}
      </Button>
    </form>
  );
}
