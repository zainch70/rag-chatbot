"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type ChatSource = {
  id: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  similarity: number;
};

export default function Sources({
  sources,
}: {
  sources: ChatSource[];
}) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <Card size="sm" className="bg-muted/30">
      <CardHeader>
        <CardTitle>Sources</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {sources.map((source, index) => (
          <div key={source.id} className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>Chunk {source.chunkIndex}</span>
                <span>Similarity {source.similarity.toFixed(3)}</span>
                <span>Doc {source.documentId.slice(0, 8)}...</span>
              </div>

              <p className="line-clamp-6 whitespace-pre-wrap text-foreground">
                {source.content}
              </p>
            </div>

            {index < sources.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
