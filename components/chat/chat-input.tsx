"use client";

import { Loader2, Plus, Send } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import ReplaceDocumentDialog from "./replace-document-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadDocument } from "@/lib/upload-document";
import { PdfValidationError } from "@/lib/validate-pdf-upload";

export default function ChatInput({
  disabled = false,
  hasActiveDocument = false,
  activeDocumentFilename = null,
  onSend,
  onUploadComplete,
}: {
  disabled?: boolean;
  hasActiveDocument?: boolean;
  activeDocumentFilename?: string | null;
  onSend: (message: string) => Promise<void> | void;
  onUploadComplete?: (result: {
    documentId: string;
    filename: string;
    isReplacing: boolean;
  }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);

  const isBusy = disabled || uploadingFile;

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isBusy) {
      return;
    }

    await onSend(trimmedMessage);
    setMessage("");
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadSelectedFile = async (file: File, isReplacing: boolean) => {
    try {
      setUploadingFile(true);

      const result = await uploadDocument(file);

      onUploadComplete?.({
        documentId: result.documentId,
        filename: result.filename,
        isReplacing,
      });
    } catch (error) {
      const errorMessage =
        error instanceof PdfValidationError || error instanceof Error
          ? error.message
          : "Upload failed.";

      toast.error(errorMessage, {
        closeButton: true,
      });
    } finally {
      setUploadingFile(false);
      resetFileInput();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (hasActiveDocument) {
      setPendingFile(file);
      setShowReplaceDialog(true);
      return;
    }

    await uploadSelectedFile(file, false);
  };

  const handleConfirmReplace = async () => {
    if (!pendingFile) {
      return;
    }

    const fileToUpload = pendingFile;

    setShowReplaceDialog(false);
    setPendingFile(null);
    await uploadSelectedFile(fileToUpload, true);
  };

  const handleCancelReplace = () => {
    setShowReplaceDialog(false);
    setPendingFile(null);
    resetFileInput();
  };

  return (
    <>
      <form
        className="flex items-center gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          await handleSubmit();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
          disabled={uploadingFile}
          aria-label="Upload PDF"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadingFile ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Plus />
          )}
        </Button>

        <Input
          placeholder={
            disabled
              ? "Upload a PDF to start chatting..."
              : "Ask something..."
          }
          value={message}
          disabled={isBusy}
          className="h-11 flex-1 rounded-2xl border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
          onChange={(event) => setMessage(event.target.value)}
        />

        <Button
          type="submit"
          size="icon"
          className="size-10 shrink-0 rounded-xl"
          disabled={disabled || uploadingFile || !message.trim()}
          aria-label="Send message"
        >
          <Send />
        </Button>
      </form>

      <ReplaceDocumentDialog
        open={showReplaceDialog}
        currentFilename={activeDocumentFilename}
        nextFilename={pendingFile?.name ?? ""}
        onConfirm={handleConfirmReplace}
        onCancel={handleCancelReplace}
      />
    </>
  );
}
