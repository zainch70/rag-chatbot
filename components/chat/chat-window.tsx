"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

import ChatEmptyIcon from "./chat-empty-icon";
import ChatInput from "./chat-input";
import ChatMessage, { type ChatMessageData } from "./chat-message";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const STARTER_PROMPTS = [
  "What is this document mainly about?",
  "Summarize the key points in bullet form.",
  "What are the most important takeaways?",
  "Explain the main section in simple terms.",
] as const;

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(
    null
  );
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(
    null
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  const isEmptyState = messages.length === 0;
  const hasActiveDocument = Boolean(activeDocumentId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (message: string) => {
    if (!activeDocumentId) {
      toast.error("Upload a PDF before asking questions.", {
        closeButton: true,
      });
      return;
    }

    const userMessage: ChatMessageData = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    const assistantMessageId = crypto.randomUUID();

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      },
    ]);
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
          documentId: activeDocumentId,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        throw new Error(errorData?.message ?? "Could not get an answer.");
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("Streaming is not supported in this browser.");
      }

      const decoder = new TextDecoder();
      let streamedContent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        streamedContent += decoder.decode(value, { stream: true });

        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantMessageId
              ? {
                  ...currentMessage,
                  content: streamedContent,
                }
              : currentMessage
          )
        );
      }

      if (!streamedContent.trim()) {
        throw new Error("Chat model returned an empty response.");
      }
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.filter(
          (currentMessage) =>
            currentMessage.id !== userMessage.id &&
            currentMessage.id !== assistantMessageId
        )
      );
      toast.error(
        error instanceof Error ? error.message : "Could not get an answer.",
        {
          closeButton: true,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = ({
    documentId,
    filename,
    isReplacing,
  }: {
    documentId: string;
    filename: string;
    isReplacing: boolean;
  }) => {
    setActiveDocumentId(documentId);
    setUploadedFilename(filename);

    if (isReplacing) {
      setMessages([]);
      toast.success(`Switched to "${filename}". Chat reset for the new document.`, {
        closeButton: true,
      });
      return;
    }

    toast.success("Document uploaded successfully.", {
      closeButton: true,
    });
  };

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-border/70 bg-background py-0 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.35)]">
      <CardHeader className="shrink-0 border-b border-border/60 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              Document chat
            </CardTitle>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span
              className={`size-2 rounded-full ${
                hasActiveDocument
                  ? "animate-pulse bg-green-500"
                  : "bg-muted-foreground/35"
              }`}
            />
            {hasActiveDocument ? "Active" : "Inactive"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-5 py-4">
        <ScrollArea className="h-0 min-h-0 flex-1 rounded-[20px] border border-border/60 bg-muted/15">
          {isEmptyState ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-border/70 bg-background">
                <ChatEmptyIcon />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Let&apos;s chat with your document
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Tap + to upload one PDF at a time, then ask a question or try
                one of these prompts.
              </p>

              <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    disabled={loading || !hasActiveDocument}
                    className="h-auto min-h-11 whitespace-normal rounded-2xl border-border/70 bg-background px-4 py-3 text-left text-sm leading-5 font-normal text-foreground hover:bg-muted/50"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-4 py-4 pr-3">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        <div className="shrink-0 space-y-2">
          {uploadedFilename ? (
            <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{uploadedFilename}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  Ready
                </span>
              </div>
              <span className="shrink-0 text-[10px]">One PDF at a time</span>
            </div>
          ) : null}

          <div className="rounded-[20px] border border-border/70 bg-background p-1.5">
            <ChatInput
              disabled={loading || !hasActiveDocument}
              hasActiveDocument={hasActiveDocument}
              activeDocumentFilename={uploadedFilename}
              onSend={handleSend}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
