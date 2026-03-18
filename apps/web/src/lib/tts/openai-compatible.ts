import { z } from "zod";
import {
	DEFAULT_EXTERNAL_TTS_VOICE,
	DEFAULT_VOICE_PACK,
} from "@/constants/tts-constants";
import { fetchWithTimeout, type FetchLike } from "./fetch-with-timeout";
import { TtsError } from "./errors";

const externalTtsConfigSchema = z.object({
	API_BASE_URL: z.string().min(1),
	API_MODEL: z.string().min(1),
	API_KEY: z.string().min(1),
});
const EXTERNAL_TTS_TIMEOUT_MS = 15_000;

export { DEFAULT_EXTERNAL_TTS_VOICE };

export interface ExternalTtsConfig {
	apiBaseUrl: string;
	apiKey: string;
	model: string;
}

function wrapExternalUpstreamError({ error }: { error: unknown }): TtsError {
	if (error instanceof TtsError) {
		return error;
	}

	return new TtsError({
		code: "EXTERNAL_TTS_UPSTREAM",
		message:
			error instanceof Error ? error.message : "External TTS request failed",
	});
}

export function getExternalTtsConfig({
	env,
}: {
	env: Record<string, string | undefined>;
}): ExternalTtsConfig {
	const parsed = externalTtsConfigSchema.safeParse(env);

	if (!parsed.success) {
		throw new TtsError({
			code: "EXTERNAL_TTS_CONFIG",
			message: "External TTS is not configured",
		});
	}

	const apiBaseUrl = parsed.data.API_BASE_URL.trim().replace(/\/+$/, "");
	const apiKey = parsed.data.API_KEY.trim();
	const model = parsed.data.API_MODEL.trim();

	if (!apiBaseUrl || !apiKey || !model) {
		throw new TtsError({
			code: "EXTERNAL_TTS_CONFIG",
			message: "External TTS is not configured",
		});
	}

	return {
		apiBaseUrl,
		apiKey,
		model,
	};
}

function resolveVoice({ voice }: { voice?: string }): string {
	if (!voice || voice === DEFAULT_VOICE_PACK) {
		return DEFAULT_EXTERNAL_TTS_VOICE;
	}

	return voice;
}

async function getUpstreamErrorMessage({
	response,
}: {
	response: Response;
}): Promise<string> {
	const contentType = response.headers.get("content-type") ?? "";
	const text = await response.text().catch(() => "");

	if (contentType.includes("application/json")) {
		const json = (() => {
			try {
				return JSON.parse(text) as {
					error?:
						| string
						| {
								message?: string;
						  };
				} | null;
			} catch {
				return null;
			}
		})();

		if (typeof json?.error === "string" && json.error.trim()) {
			return json.error;
		}

		if (
			typeof json?.error === "object" &&
			typeof json.error?.message === "string" &&
			json.error.message.trim()
		) {
			return json.error.message;
		}
	}

	if (text.trim()) {
		return text;
	}

	return String(response.status);
}

function getSpeechEndpointUrls({
	apiBaseUrl,
}: {
	apiBaseUrl: string;
}): string[] {
	const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, "");
	const baseWithoutV1 = normalizedBaseUrl.endsWith("/v1")
		? normalizedBaseUrl.slice(0, -3)
		: normalizedBaseUrl;
	const baseWithV1 = normalizedBaseUrl.endsWith("/v1")
		? normalizedBaseUrl
		: `${normalizedBaseUrl}/v1`;
	const urls = [`${baseWithV1}/audio/speech`, `${baseWithoutV1}/audio/speech`];

	return [...new Set(urls)];
}

export async function synthesizeSpeechWithOpenAiCompatible({
	config,
	text,
	voice,
	fetchImpl = fetch,
	timeoutMs = EXTERNAL_TTS_TIMEOUT_MS,
}: {
	config: ExternalTtsConfig;
	text: string;
	voice?: string;
	fetchImpl?: FetchLike;
	timeoutMs?: number;
}): Promise<ArrayBuffer> {
	const endpointUrls = getSpeechEndpointUrls({
		apiBaseUrl: config.apiBaseUrl,
	});
	const requestInit = {
		method: "POST",
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			input: text,
			model: config.model,
			response_format: "mp3",
			voice: resolveVoice({ voice }),
		}),
	} satisfies RequestInit;

	let lastErrorResponse: Response | null = null;

	for (const endpointUrl of endpointUrls) {
		let response: Response;

		try {
			response = await fetchWithTimeout({
				fetchImpl,
				init: requestInit,
				input: endpointUrl,
				timeoutMessage: "External TTS request timed out",
				timeoutMs,
			});
		} catch (error) {
			throw wrapExternalUpstreamError({ error });
		}

		if (response.ok) {
			const contentType = response.headers.get("content-type") ?? "";
			const mimeType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";

			if (
				!mimeType.startsWith("audio/") &&
				mimeType !== "application/octet-stream"
			) {
				throw new TtsError({
					code: "EXTERNAL_TTS_UPSTREAM",
					message: `Expected audio response, received ${contentType || "(no content-type)"}`,
				});
			}

			const audio = await response.arrayBuffer();

			if (audio.byteLength === 0) {
				throw new TtsError({
					code: "EXTERNAL_TTS_UPSTREAM",
					message: "External TTS returned empty audio",
				});
			}

			return audio;
		}

		lastErrorResponse = response;

		if (response.status !== 404) {
			break;
		}
	}

	throw new TtsError({
		code: "EXTERNAL_TTS_UPSTREAM",
		message: `External TTS request failed: ${await getUpstreamErrorMessage({
			response: lastErrorResponse ?? new Response(null, { status: 500 }),
		})}`,
	});
}
