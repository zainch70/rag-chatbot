import ChatWindow from "@/components/chat/chat-window";
import UploadForm from "@/components/upload/upload-form";

export default function HomePage() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start">
        <UploadForm />
        <ChatWindow />
      </div>
    </main>
  );
}