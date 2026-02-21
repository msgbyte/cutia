import type {
	AIImageProvider,
	ImageGenerationRequest,
	ImageGenerationResult,
} from "./types";

const GEMINI_API_BASE =
	"https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3-pro-image-preview";

interface GeminiInlineData {
	mimeType: string;
	data: string;
}

interface GeminiPart {
	text?: string;
	inlineData?: GeminiInlineData;
}

interface GeminiCandidate {
	content?: {
		parts?: GeminiPart[];
	};
}

interface GeminiResponse {
	candidates?: GeminiCandidate[];
	error?: { message: string };
}

function buildPayload({
	prompt,
	aspectRatio,
}: {
	prompt: string;
	aspectRatio?: string;
}): Record<string, unknown> {
	const generationConfig: Record<string, unknown> = {
		responseModalities: ["IMAGE"],
		maxOutputTokens: 32768,
	};

	if (aspectRatio) {
		generationConfig.imageConfig = {
			aspectRatio,
			imageSize: "2K",
		};
	}

	return {
		contents: [
			{
				role: "user",
				parts: [
					{
						text: `Please generate an image that matches the following prompt: ${prompt}`,
					},
				],
			},
		],
		generationConfig,
		safetySettings: [
			{
				category: "HARM_CATEGORY_HATE_SPEECH",
				threshold: "BLOCK_NONE",
			},
			{
				category: "HARM_CATEGORY_DANGEROUS_CONTENT",
				threshold: "BLOCK_NONE",
			},
			{
				category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
				threshold: "BLOCK_NONE",
			},
			{
				category: "HARM_CATEGORY_HARASSMENT",
				threshold: "BLOCK_NONE",
			},
		],
	};
}

function extractImages({
	response,
}: {
	response: GeminiResponse;
}): ImageGenerationResult[] {
	const candidates = response.candidates ?? [];
	const images: ImageGenerationResult[] = [];

	for (const candidate of candidates) {
		const parts = candidate.content?.parts ?? [];
		for (const part of parts) {
			if (part.inlineData?.data) {
				const mimeType = part.inlineData.mimeType || "image/png";
				const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
				images.push({ url: dataUrl });
			}
		}
	}

	return images;
}

export const nanoBananaProvider: AIImageProvider = {
	id: "nanobanana",
	name: "Nano Banana (Gemini)",
	description: "Google Gemini API - Nano Banana image generation",
	useProxy: true,

	async generateImage({
		request,
		apiKey,
	}: {
		request: ImageGenerationRequest;
		apiKey: string;
	}): Promise<ImageGenerationResult[]> {
		if (!apiKey) {
			throw new Error("Gemini API key is not configured");
		}

		const payload = buildPayload({
			prompt: request.prompt,
			aspectRatio: request.aspectRatio,
		});

		const apiUrl = `${GEMINI_API_BASE}/${DEFAULT_MODEL}:generateContent`;

		const response = await fetch("/api/ai/image/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				url: apiUrl,
				headers: { "x-goog-api-key": apiKey },
				body: payload,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Nano Banana API error: ${response.status} - ${errorText}`,
			);
		}

		const result: GeminiResponse = await response.json();

		if (result.error) {
			throw new Error(`Gemini API error: ${result.error.message}`);
		}

		const images = extractImages({ response: result });

		if (images.length === 0) {
			throw new Error("Nano Banana API returned no images");
		}

		return images;
	},
};
