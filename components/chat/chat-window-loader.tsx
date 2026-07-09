"use client";

import dynamic from "next/dynamic";

const ChatWindow = dynamic(() => import("@/components/chat/chat-window"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[480px] animate-pulse rounded-[24px] border border-border/70 bg-background" />
  ),
});

export default function ChatWindowLoader() {
  return <ChatWindow />;
}
