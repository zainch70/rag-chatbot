export type ChunkOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

export type TextChunk = {
  index: number;
  content: string;
};

export class TextChunkerService {
  chunk(
    text: string,
    {
      chunkSize = 1000,//means the maximum number of characters in a single chunk, not words or tokens.
      chunkOverlap = 200,
    }: ChunkOptions = {}
  ): TextChunk[] {
    if (!text.trim()) {
      return [];
    }

    const chunks: TextChunk[] = [];

    let start = 0;
    let index = 0;

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // Prevent cutting words in half
      if (end < text.length) {
        while (
          end > start &&
          !/\s/.test(text[end])
        ) {
          end--;
        }

        if (end === start) {
          end = Math.min(start + chunkSize, text.length);
        }
      }

      const content = text
        .slice(start, end)
        .trim();

      chunks.push({
        index,
        content,
      });

      index++;

      if (end >= text.length) {
        break;
      }

      start = end - chunkOverlap;
    }

    return chunks;
  }
}

export const textChunkerService =
  new TextChunkerService();