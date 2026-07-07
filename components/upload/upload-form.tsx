"use client";

import { useState } from "react";

import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      toast.success("Document uploaded successfully.");

      console.log(data);

      setFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Upload PDF</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const selected = e.target.files?.[0];

            if (!selected) return;

            setFile(selected);
          }}
        />

        {file && (
          <div className="rounded-md border p-3 text-sm">{file.name}</div>
        )}

        <Button
          className="w-full"
          disabled={!file || loading}
          onClick={handleUpload}
        >
          <Upload className="mr-2 h-4 w-4" />
          {loading ? "Uploading..." : "Upload Document"}
        </Button>
      </CardContent>
    </Card>
  );
}
