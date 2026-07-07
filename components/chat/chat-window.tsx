"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import ChatInput from "./chat-input";
import ChatMessage, { type ChatMessageData } from "./chat-message";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatApiResponse = {
  answer: string;
};

const WELCOME_MESSAGE: ChatMessageData = {
  id: "welcome",
  role: "assistant",
  content: "Upload a PDF, then ask me anything about it.",
};

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    WELCOME_MESSAGE,
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (message: string) => {
    const userMessage: ChatMessageData = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          limit: 5,
        }),
      });

      const data = (await response.json()) as
        | ChatApiResponse
        | { message?: string };

      if (!response.ok || !("answer" in data)) {
        throw new Error(
          "message" in data && data.message
            ? data.message
            : "Could not get an answer."
        );
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.filter(
          (currentMessage) => currentMessage.id !== userMessage.id
        )
      );
      toast.error(
        error instanceof Error ? error.message : "Could not get an answer."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex h-full min-h-[480px] flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Chat</CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <ScrollArea className="min-h-0 flex-1 rounded-lg border bg-muted/20 p-3">
          <div className="space-y-3 pr-2">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {loading ? (
              <p className="text-sm text-muted-foreground">Thinking...</p>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <ChatInput disabled={loading} onSend={handleSend} />
      </CardContent>
    </Card>
  );
}
