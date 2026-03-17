import { z } from "zod";
import { fetchWithTimeout } from "./fetch-with-timeout";

const LEGACY_TTS_API_BASE = "https://api.milorapart.top/apis/mbAIsc";
const LEGACY_TTS_ALLOWED_AUDIO_HOSTS = new Set(["api.milorapart.top"]);
const LEGACY_TTS_TIMEOUT_MS = 15_000;
const LEGACY_TTS_MAX_URL_LENGTH = 1_800;

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
	timeoutMs = LEGACY_TTS_TIMEOUT_MS,
}: {
	text: string;
	voice?: string;
	fetchImpl?: FetchLike;
	timeoutMs?: number;
}): Promise<ArrayBuffer> {
	const query = new URLSearchParams({
		format: "mp3",
		text,
	}).toString();
	const upstreamUrl = `${LEGACY_TTS_API_BASE}?${query}`;

	if (upstreamUrl.length > LEGACY_TTS_MAX_URL_LENGTH) {
		throw new Error("Legacy TTS text is too long for GET fallback");
	}

	const upstreamResponse = await fetchWithTimeout({
		fetchImpl,
		input: upstreamUrl,
		timeoutMessage: "Legacy TTS request timed out",
		timeoutMs,
	});

	if (!upstreamResponse.ok) {
		throw new Error(`Legacy TTS request failed: ${upstreamResponse.status}`);
	}

	const upstreamJson = await upstreamResponse.json().catch(() => null);
	const parsed = legacyResponseSchema.safeParse(upstreamJson);

	if (!parsed.success || parsed.data.code !== 200) {
		throw new Error("Legacy TTS generation failed");
	}

	const audioUrl = new URL(parsed.data.url);

	if (
		audioUrl.protocol !== "https:" ||
		!LEGACY_TTS_ALLOWED_AUDIO_HOSTS.has(audioUrl.hostname)
	) {
		throw new Error("Legacy TTS returned an unexpected audio URL");
	}

	const audioResponse = await fetchWithTimeout({
		fetchImpl,
		input: audioUrl,
		timeoutMessage: "Legacy TTS audio download timed out",
		timeoutMs,
	});

	if (!audioResponse.ok) {
		throw new Error(
			`Legacy TTS audio download failed: ${audioResponse.status}`,
		);
	}

	const contentType = audioResponse.headers.get("content-type") ?? "";

	if (
		!contentType.includes("audio/") &&
		contentType !== "application/octet-stream"
	) {
		throw new Error(
			`Legacy TTS returned non-audio content: ${contentType || "(no content-type)"}`,
		);
	}

	const audio = await audioResponse.arrayBuffer();

	if (audio.byteLength === 0) {
		throw new Error("Legacy TTS returned empty audio");
	}

	return audio;
}
