import { z } from "zod";

const LEGACY_TTS_API_BASE = "https://api.milorapart.top/apis/mbAIsc";

const legacyResponseSchema = z.object({
	code: z.number(),
	url: z.string().url(),
});

type FetchLike = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

export async function synthesizeSpeechWithLegacyProvider({
	text,
	fetchImpl = fetch,
}: {
	text: string;
	voice?: string;
	fetchImpl?: FetchLike;
}): Promise<ArrayBuffer> {
	const upstreamUrl = `${LEGACY_TTS_API_BASE}?${new URLSearchParams({
		format: "mp3",
		text,
	})}`;
	const upstreamResponse = await fetchImpl(upstreamUrl);

	if (!upstreamResponse.ok) {
		throw new Error(`Legacy TTS request failed: ${upstreamResponse.status}`);
	}

	const upstreamJson = await upstreamResponse.json().catch(() => null);
	const parsed = legacyResponseSchema.safeParse(upstreamJson);

	if (!parsed.success || parsed.data.code !== 200) {
		throw new Error("Legacy TTS generation failed");
	}

	const audioResponse = await fetchImpl(parsed.data.url);

	if (!audioResponse.ok) {
		throw new Error(
			`Legacy TTS audio download failed: ${audioResponse.status}`,
		);
	}

	const audio = await audioResponse.arrayBuffer();

	if (audio.byteLength === 0) {
		throw new Error("Legacy TTS returned empty audio");
	}

	return audio;
}
