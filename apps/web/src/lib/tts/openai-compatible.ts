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
const EXTERNAL_TTS_RESPONSES_AUDIO_FORMAT = "mp3";

export { DEFAULT_EXTERNAL_TTS_VOICE };

export interface ExternalTtsConfig {
	apiBaseUrl: string;
	apiKey: string;
	model: string;
}

interface ExternalTtsWebSocketMessageEvent {
	data: unknown;
}

interface ExternalTtsWebSocketErrorEvent {
	message?: string;
	type?: string;
}

interface ExternalTtsWebSocketCloseEvent {
	code: number;
	reason: string;
}

export interface ExternalTtsWebSocketLike {
	addEventListener(
		type: "close",
		listener: (event: ExternalTtsWebSocketCloseEvent) => void,
	): void;
	addEventListener(
		type: "error",
		listener: (event: ExternalTtsWebSocketErrorEvent) => void,
	): void;
	addEventListener(
		type: "message",
		listener: (event: ExternalTtsWebSocketMessageEvent) => void,
	): void;
	addEventListener(type: "open", listener: () => void): void;
	close(code?: number, reason?: string): void;
	removeEventListener?(
		type: "close",
		listener: (event: ExternalTtsWebSocketCloseEvent) => void,
	): void;
	removeEventListener?(
		type: "error",
		listener: (event: ExternalTtsWebSocketErrorEvent) => void,
	): void;
	removeEventListener?(
		type: "message",
		listener: (event: ExternalTtsWebSocketMessageEvent) => void,
	): void;
	removeEventListener?(type: "open", listener: () => void): void;
	send(data: string): void;
}

export type ExternalTtsWebSocketFactory = (
	url: string,
	init?: {
		headers?: Record<string, string>;
	},
) => ExternalTtsWebSocketLike;

function resolveExternalTtsEnv({
	env,
}: {
	env: Record<string, string | undefined>;
}): Record<"API_BASE_URL" | "API_MODEL" | "API_KEY", string | undefined> {
	return {
		API_BASE_URL: env.EXTERNAL_TTS_API_BASE_URL ?? env.API_BASE_URL,
		API_MODEL: env.EXTERNAL_TTS_API_MODEL ?? env.API_MODEL,
		API_KEY: env.EXTERNAL_TTS_API_KEY ?? env.API_KEY,
	};
}

function isRetryableStatus(status: number | undefined): boolean {
	if (status == null) {
		return true;
	}

	return status === 408 || status === 429 || status >= 500;
}

function wrapExternalUpstreamError({ error }: { error: unknown }): TtsError {
	if (error instanceof TtsError) {
		return error;
	}

	return new TtsError({
		code: "EXTERNAL_TTS_UPSTREAM",
		message:
			error instanceof Error ? error.message : "External TTS request failed",
		retryable: true,
	});
}

export function getExternalTtsConfig({
	env,
}: {
	env: Record<string, string | undefined>;
}): ExternalTtsConfig {
	const parsed = externalTtsConfigSchema.safeParse(
		resolveExternalTtsEnv({ env }),
	);

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

	try {
		const url = new URL(apiBaseUrl);

		if (url.protocol !== "http:" && url.protocol !== "https:") {
			throw new Error("Unsupported protocol");
		}
	} catch {
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

function getResponsesEndpointUrls({
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
	const urls = [`${baseWithV1}/responses`, `${baseWithoutV1}/responses`];

	return [...new Set(urls)];
}

function toWebSocketUrl({ url }: { url: string }): string {
	const parsed = new URL(url);
	parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
	return parsed.toString();
}

function isAudioContentType({ contentType }: { contentType: string }): boolean {
	const mimeType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";

	return mimeType.startsWith("audio/") || mimeType === "application/octet-stream";
}

function shouldTryResponsesWebSocket({
	response,
}: {
	response: Response;
}): boolean {
	if (response.status === 404 || response.status === 405 || response.status === 426) {
		return true;
	}

	if (!response.ok) {
		return false;
	}

	const contentType = response.headers.get("content-type") ?? "";
	const mimeType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";

	return mimeType === "text/html";
}

function getResponsesWebSocketCloseRetryable({
	code,
	reason,
}: {
	code: number;
	reason: string;
}): boolean {
	const normalizedReason = reason.trim().toLowerCase();

	if (
		normalizedReason.includes("no available account") ||
		normalizedReason.includes("required") ||
		normalizedReason.includes("unsupported")
	) {
		return false;
	}

	return code === 1006 || code === 1011 || code === 1012 || code === 1013;
}

function getResponsesWebSocketError({
	code,
	reason,
}: {
	code: number;
	reason: string;
}): TtsError {
	return new TtsError({
		code: "EXTERNAL_TTS_UPSTREAM",
		message: `External TTS websocket request failed: ${
			reason || `WebSocket closed (${code})`
		}`,
		retryable: getResponsesWebSocketCloseRetryable({ code, reason }),
	});
}

function getResponseEventErrorMessage({
	event,
}: {
	event: Record<string, unknown>;
}): string | null {
	if (typeof event.message === "string" && event.message.trim()) {
		return event.message;
	}

	if (
		typeof event.error === "object" &&
		event.error !== null &&
		"message" in event.error &&
		typeof event.error.message === "string" &&
		event.error.message.trim()
	) {
		return event.error.message;
	}

	return null;
}

function createExternalTtsWebSocket(
	url: string,
	init?: { headers?: Record<string, string> },
): ExternalTtsWebSocketLike {
	type NodeCompatibleWebSocket = new (
		url: string,
		init?: { headers?: Record<string, string> },
	) => ExternalTtsWebSocketLike;

	const WebSocketCtor =
		globalThis.WebSocket as unknown as NodeCompatibleWebSocket;

	return new WebSocketCtor(url, init);
}

async function synthesizeSpeechWithResponsesWebSocket({
	config,
	createWebSocket = createExternalTtsWebSocket,
	text,
	voice,
}: {
	config: ExternalTtsConfig;
	createWebSocket?: ExternalTtsWebSocketFactory;
	text: string;
	voice?: string;
}): Promise<ArrayBuffer> {
	const endpointUrl = toWebSocketUrl({
		url:
			getResponsesEndpointUrls({ apiBaseUrl: config.apiBaseUrl })[0] ??
			`${config.apiBaseUrl.replace(/\/+$/, "")}/responses`,
	});
	const audioChunks: Uint8Array[] = [];

	return await new Promise<ArrayBuffer>((resolve, reject) => {
		const socket = createWebSocket(endpointUrl, {
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
			},
		});
		let settled = false;

		const cleanup = () => {
			socket.removeEventListener?.("close", handleClose);
			socket.removeEventListener?.("error", handleError);
			socket.removeEventListener?.("message", handleMessage);
			socket.removeEventListener?.("open", handleOpen);
		};

		const finish = ({
			error,
			value,
		}: {
			error?: TtsError;
			value?: ArrayBuffer;
		}) => {
			if (settled) {
				return;
			}

			settled = true;
			cleanup();

			try {
				socket.close();
			} catch {
				// Best effort cleanup only.
			}

			if (error) {
				reject(error);
				return;
			}

			resolve(value ?? new ArrayBuffer(0));
		};

		const handleOpen = () => {
			try {
				socket.send(
					JSON.stringify({
						audio: {
							format: EXTERNAL_TTS_RESPONSES_AUDIO_FORMAT,
						},
						input: text,
						model: config.model,
						output_modalities: ["audio"],
						response: {
							instructions: text,
							modalities: ["audio"],
							output_audio_format: EXTERNAL_TTS_RESPONSES_AUDIO_FORMAT,
							voice: resolveVoice({ voice }),
						},
						type: "response.create",
					}),
				);
			} catch (error) {
				finish({
					error: wrapExternalUpstreamError({ error }),
				});
			}
		};

		const handleMessage = async ({
			data,
		}: ExternalTtsWebSocketMessageEvent) => {
			try {
				if (data instanceof Blob) {
					audioChunks.push(new Uint8Array(await data.arrayBuffer()));
					return;
				}

				if (data instanceof ArrayBuffer) {
					audioChunks.push(new Uint8Array(data));
					return;
				}

				if (ArrayBuffer.isView(data)) {
					audioChunks.push(
						new Uint8Array(
							data.buffer.slice(
								data.byteOffset,
								data.byteOffset + data.byteLength,
							),
						),
					);
					return;
				}

				if (typeof data !== "string") {
					return;
				}

				const event = JSON.parse(data) as Record<string, unknown>;
				const type = typeof event.type === "string" ? event.type : "";

				if (
					type === "response.audio.delta" ||
					type === "response.output_audio.delta"
				) {
					if (typeof event.delta === "string" && event.delta.length > 0) {
						audioChunks.push(Uint8Array.from(Buffer.from(event.delta, "base64")));
					}
					return;
				}

				if (type === "response.completed" || type === "response.done") {
					const audio = Buffer.concat(
						audioChunks.map((chunk) => Buffer.from(chunk)),
					);

					if (audio.byteLength === 0) {
						finish({
							error: new TtsError({
								code: "EXTERNAL_TTS_UPSTREAM",
								message: "External TTS returned empty audio",
								retryable: false,
							}),
						});
						return;
					}

					finish({
						value: audio.buffer.slice(
							audio.byteOffset,
							audio.byteOffset + audio.byteLength,
						),
					});
					return;
				}

				if (
					type === "error" ||
					type === "response.error" ||
					type === "response.failed" ||
					type === "response.incomplete"
				) {
					finish({
						error: new TtsError({
							code: "EXTERNAL_TTS_UPSTREAM",
							message:
								getResponseEventErrorMessage({ event }) ??
								"External TTS websocket request failed",
							retryable: false,
						}),
					});
				}
			} catch (error) {
				finish({
					error: wrapExternalUpstreamError({ error }),
				});
			}
		};

		const handleError = (event: ExternalTtsWebSocketErrorEvent) => {
			finish({
				error: new TtsError({
					code: "EXTERNAL_TTS_UPSTREAM",
					message:
						event.message?.trim() || "External TTS websocket request failed",
					retryable: true,
				}),
			});
		};

		const handleClose = ({ code, reason }: ExternalTtsWebSocketCloseEvent) => {
			if (settled) {
				return;
			}

			finish({
				error: getResponsesWebSocketError({ code, reason }),
			});
		};

		socket.addEventListener("open", handleOpen);
		socket.addEventListener("message", handleMessage);
		socket.addEventListener("error", handleError);
		socket.addEventListener("close", handleClose);
	});
}

export async function synthesizeSpeechWithOpenAiCompatible({
	config,
	createWebSocket = createExternalTtsWebSocket,
	text,
	voice,
	fetchImpl = fetch,
	timeoutMs = EXTERNAL_TTS_TIMEOUT_MS,
}: {
	config: ExternalTtsConfig;
	createWebSocket?: ExternalTtsWebSocketFactory;
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
			if (!isAudioContentType({ contentType })) {
				if (shouldTryResponsesWebSocket({ response })) {
					lastErrorResponse = response;
					break;
				}

				throw new TtsError({
					code: "EXTERNAL_TTS_UPSTREAM",
					message: `Expected audio response, received ${contentType || "(no content-type)"}`,
					retryable: false,
					status: response.status,
				});
			}

			let audio: ArrayBuffer;

			try {
				audio = await response.arrayBuffer();
			} catch (error) {
				throw new TtsError({
					code: "EXTERNAL_TTS_UPSTREAM",
					message: `External TTS audio read failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					retryable: false,
					status: response.status,
				});
			}

			if (audio.byteLength === 0) {
				throw new TtsError({
					code: "EXTERNAL_TTS_UPSTREAM",
					message: "External TTS returned empty audio",
					retryable: false,
					status: response.status,
				});
			}

			return audio;
		}

		lastErrorResponse = response;

		if (response.status !== 404) {
			break;
		}
	}

	if (
		lastErrorResponse &&
		shouldTryResponsesWebSocket({ response: lastErrorResponse })
	) {
		return synthesizeSpeechWithResponsesWebSocket({
			config,
			createWebSocket,
			text,
			voice,
		});
	}

	if (!lastErrorResponse) {
		throw new Error(
			"Expected external TTS to capture an upstream response before failing",
		);
	}

	throw new TtsError({
		code: "EXTERNAL_TTS_UPSTREAM",
		message: `External TTS request failed: ${await getUpstreamErrorMessage({
			response: lastErrorResponse,
		})}`,
		retryable: isRetryableStatus(lastErrorResponse.status),
		status: lastErrorResponse.status,
	});
}
