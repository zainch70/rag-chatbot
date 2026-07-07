import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export class EmbeddingService {
	async generateEmbedding(text: string): Promise<number[]> {
		if (!process.env.OPENAI_API_KEY) {
			throw new Error("OPENAI_API_KEY is not configured.");
		}

		const response = await openai.embeddings.create({
			model: "text-embedding-3-small",
			input: text,
		});

		return response.data[0]?.embedding ?? [];
	}
}

export const embeddingService = new EmbeddingService();
