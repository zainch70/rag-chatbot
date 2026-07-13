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
  if (sources.length === 0) {
    return `You are a helpful company knowledge assistant.

No reliable supporting context was found for this question.
Reply with a brief, natural fallback such as "I couldn't find enough information to answer that clearly."
Do not mention context, sources, retrieval, documents, or system limitations.
Do not guess or invent details.

Question:
${question}`;
  }

  const context = sources
    .map(
      (source, index) =>
        `Source ${index + 1} (documentId: ${source.documentId}, chunkIndex: ${source.chunkIndex}, similarity: ${source.similarity.toFixed(4)}):\n${source.content}`
    )
    .join("\n\n");

  return `You are a helpful company knowledge assistant.

Answer the question using only the supported facts in the provided context.
If the context is not sufficient, reply with a brief, natural fallback such as "I couldn't find enough information to answer that clearly."
Do not mention context, sources, retrieval, documents, or system limitations unless the user explicitly asks.
Be concise, direct, and factual. Do not guess or invent details.

Context:
${context}

Question:
${question}`;
}
