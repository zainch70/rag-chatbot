type RetrievalSource = {
  documentId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
};

export function buildRagPrompt({
  question,
  sources,
}: {
  question: string;
  sources: RetrievalSource[];
}) {
  const context = sources
    .map(
      (source, index) =>
        `Source ${index + 1} (documentId: ${source.documentId}, chunkIndex: ${source.chunkIndex}, similarity: ${source.similarity.toFixed(4)}):\n${source.content}`
    )
    .join("\n\n");

  return `You are a helpful RAG assistant.

Answer the question using only the provided context.
If the answer is not supported by the context, say you could not find it in the uploaded documents.
Be concise and factual. Do not invent details.

Context:
${context || "No relevant context found."}

Question:
${question}`;
}
