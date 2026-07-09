"use client";

import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ReplaceDocumentDialog({
  open,
  currentFilename,
  nextFilename,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  currentFilename: string | null;
  nextFilename: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]">
      <Card className="w-full max-w-md rounded-[24px] border border-border/70 bg-background py-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)]">
        <CardHeader className="gap-2 border-b border-border/60 px-5 py-5">
          <CardTitle className="text-base font-semibold">
            Replace current PDF?
          </CardTitle>
          <CardDescription className="leading-6">
            Only one PDF can be active at a time. Switching documents will clear
            your current chat.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-5 py-5">
          <div className="space-y-3">
            {currentFilename ? (
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Current
                  </p>
                  <p className="truncate text-sm text-foreground">
                    {currentFilename}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background p-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  New
                </p>
                <p className="truncate text-sm text-foreground">
                  {nextFilename}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={onConfirm}>
              Replace PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
