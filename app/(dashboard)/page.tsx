import ChatWindow from "@/components/chat/chat-window";

export default function HomePage() {
  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(to_bottom,#fafafa,#f4f4f5)]">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-4 py-4 sm:px-6">
        <ChatWindow />
      </div>
    </main>
  );
}