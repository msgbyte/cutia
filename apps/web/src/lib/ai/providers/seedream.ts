import type {
	AIImageProvider,
	ImageGenerationRequest,
	ImageGenerationResult,
} from "./types";

const ARK_API_URL =
	"https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";
const DEFAULT_MODEL = "seedream-4-5-251128";

function buildPrompt({
	prompt,
	aspectRatio,
}: {
	prompt: string;
	aspectRatio?: string;
}): string {
	if (!aspectRatio) {
		return prompt;
	}
	return `${prompt}\n\naspect_ratio="${aspectRatio}"`;
}

async function fetchDirect({
	payload,
	apiKey,
}: {
	payload: Record<string, unknown>;
	apiKey: string;
}): Promise<Response> {
	return fetch(ARK_API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(payload),
	});
}

async function fetchViaProxy({
	payload,
	apiKey,
}: {
	payload: Record<string, unknown>;
	apiKey: string;
}): Promise<Response> {
	return fetch("/api/ai/image/generate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			url: ARK_API_URL,
			headers: { Authorization: `Bearer ${apiKey}` },
			body: payload,
		}),
	});
}

export const seedreamProvider: AIImageProvider = {
	id: "seedream",
	name: "Seedream (ByteDance Ark)",
	description: "ByteDance Ark API - Seedream 4.5 image generation",
	useProxy: true,

	async generateImage({
		request,
		apiKey,
	}: {
		request: ImageGenerationRequest;
		apiKey: string;
	}): Promise<ImageGenerationResult[]> {
		if (!apiKey) {
			throw new Error("ARK_API_KEY is not configured");
		}

		const finalPrompt = buildPrompt({
			prompt: request.prompt,
			aspectRatio: request.aspectRatio,
		});

		const payload = {
			model: DEFAULT_MODEL,
			prompt: finalPrompt,
			sequential_image_generation: "disabled",
			response_format: "b64_json",
			size: "2K",
			stream: false,
			watermark: false,
		};

		const doFetch = this.useProxy ? fetchViaProxy : fetchDirect;
		const response = await doFetch({ payload, apiKey });

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Seedream API error: ${response.status} - ${errorText}`,
			);
		}

		const result = await response.json();
		const dataList: Array<{ url?: string; b64_json?: string }> = result.data ?? [];

		if (dataList.length === 0) {
			throw new Error("Seedream API returned no images");
		}

		const images: ImageGenerationResult[] = [];
		for (const item of dataList) {
			if (item.b64_json) {
				images.push({ url: `data:image/png;base64,${item.b64_json}` });
				continue;
			}
			if (item.url) {
				images.push({ url: item.url });
			}
		}

		if (images.length === 0) {
			throw new Error("No valid image URLs in Seedream API response");
		}

		return images;
	},
};
