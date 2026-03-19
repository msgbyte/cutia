import { z } from "zod";
import { fetchWithTimeout, type FetchLike } from "./fetch-with-timeout";
import { TtsError } from "./errors";

const LEGACY_TTS_API_BASE = "https://api.milorapart.top/apis/mbAIsc";
const LEGACY_TTS_ALLOWED_AUDIO_HOSTS = new Set(["api.milorapart.top"]);
const LEGACY_TTS_TIMEOUT_MS = 15_000;
const LEGACY_TTS_MAX_URL_LENGTH = 1_800;

const legacyResponseSchema = z.object({
	code: z.number(),
	url: z.string().url(),
});

function isRedirectStatus(status: number): boolean {
	return status >= 300 && status < 400;
}

function wrapLegacyUpstreamError({ error }: { error: unknown }): TtsError {
	if (error instanceof TtsError) {
		return error;
	}

	return new TtsError({
		code: "LEGACY_TTS_UPSTREAM",
		message:
			error instanceof Error ? error.message : "Legacy TTS generation failed",
	});
}

export async function synthesizeSpeechWithLegacyProvider({
	text,
	voice: _voice,
	fetchImpl = fetch,
	timeoutMs = LEGACY_TTS_TIMEOUT_MS,
}: {
	text: string;
	voice?: string;
	fetchImpl?: FetchLike;
	timeoutMs?: number;
}): Promise<ArrayBuffer> {
	void _voice; // Legacy upstream has a fixed voice; keep the arg for parity.

	const query = new URLSearchParams({
		format: "mp3",
		text,
	}).toString();
	const upstreamUrl = `${LEGACY_TTS_API_BASE}?${query}`;

	if (upstreamUrl.length > LEGACY_TTS_MAX_URL_LENGTH) {
		throw new TtsError({
			code: "LEGACY_TTS_UPSTREAM",
			message: "Legacy TTS text is too long for GET fallback",
		});
	}

	let upstreamResponse: Response;

	try {
		upstreamResponse = await fetchWithTimeout({
			fetchImpl,
			input: upstreamUrl,
			timeoutMessage: "Legacy TTS request timed out",
			timeoutMs,
		});
	} catch (error) {
		throw wrapLegacyUpstreamError({ error });
	}

	if (!upstreamResponse.ok) {
		throw new TtsError({
			code: "LEGACY_TTS_UPSTREAM",
			message: `Legacy TTS request failed: ${upstreamResponse.status}`,
		});
	}

	const upstreamJson = await upstreamResponse.json().catch(() => null);
	const parsed = legacyResponseSchema.safeParse(upstreamJson);

	if (!parsed.success || parsed.data.code !== 200) {
		throw new TtsError({
			code: "LEGACY_TTS_UPSTREAM",
			message: "Legacy TTS generation failed",
		});
	}

	const audioUrl = new URL(parsed.data.url);

	if (
		audioUrl.protocol !== "https:" ||
		!LEGACY_TTS_ALLOWED_AUDIO_HOSTS.has(audioUrl.hostname)
	) {
		throw new TtsError({
			code: "LEGACY_TTS_UPSTREAM",
			message: "Legacy TTS returned an unexpected audio URL",
		});
	}

	let audioResponse: Response;

	try {
		audioResponse = await fetchWithTimeout({
			fetchImpl,
			init: { redirect: "manual" },
			input: audioUrl,
			timeoutMessage: "Legacy TTS audio download timed out",
			timeoutMs,
		});
	} catch (error) {
		throw wrapLegacyUpstreamError({ error });
	}

	if (isRedirectStatus(audioResponse.status)) {
		const location = audioResponse.headers.get("location");

		if (!location) {
			throw new TtsError({
				code: "LEGACY_TTS_UPSTREAM",
				message: `Legacy TTS audio download failed: ${audioResponse.status}`,
			});
		}

		let redirectUrl: URL;

		try {
			redirectUrl = new URL(location, audioUrl);
		} catch {
			throw new TtsError({
				code: "LEGACY_TTS_UPSTREAM",
				message: "Legacy TTS audio download redirected to an invalid URL",
			});
		}

		if (
			redirectUrl.protocol !== "https:" ||
			!LEGACY_TTS_ALLOWED_AUDIO_HOSTS.has(redirectUrl.hostname)
		) {
			throw new TtsError({
				code: "LEGACY_TTS_UPSTREAM",
				message: "Legacy TTS audio download redirected to an unexpected host",
			});
		}
	}

	if (!audioResponse.ok) {
		throw new TtsError({
			code: "LEGACY_TTS_UPSTREAM",
			message: `Legacy TTS audio download failed: ${audioResponse.status}`,
		});
	}

	const contentType = audioResponse.headers.get("content-type") ?? "";
	const mimeType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";

	if (
		!mimeType.startsWith("audio/") &&
		mimeType !== "application/octet-stream"
	) {
		throw new TtsError({
			code: "LEGACY_TTS_UPSTREAM",
			message: `Legacy TTS returned non-audio content: ${contentType || "(no content-type)"}`,
		});
	}

	const audio = await audioResponse.arrayBuffer();

	if (audio.byteLength === 0) {
		throw new TtsError({
			code: "LEGACY_TTS_UPSTREAM",
			message: "Legacy TTS returned empty audio",
		});
	}

	return audio;
}
