import { describe, expect, test } from "bun:test";
import {
	DEFAULT_EXTERNAL_TTS_VOICE,
	getExternalTtsConfig,
	synthesizeSpeechWithOpenAiCompatible,
} from "./openai-compatible";

type WebSocketListenerMap = {
	close: Array<(event: { code: number; reason: string }) => void>;
	error: Array<(event: { message?: string; type?: string }) => void>;
	message: Array<(event: { data: unknown }) => void>;
	open: Array<() => void>;
};

class FakeWebSocket {
	public readonly sentMessages: string[] = [];
	private readonly listeners: WebSocketListenerMap = {
		close: [],
		error: [],
		message: [],
		open: [],
	};

	constructor(
		public readonly url: string,
		public readonly init?: { headers?: Record<string, string> },
	) {}

	addEventListener(
		type: "close",
		listener: WebSocketListenerMap["close"][number],
	): void;
	addEventListener(
		type: "error",
		listener: WebSocketListenerMap["error"][number],
	): void;
	addEventListener(
		type: "message",
		listener: WebSocketListenerMap["message"][number],
	): void;
	addEventListener(
		type: "open",
		listener: WebSocketListenerMap["open"][number],
	): void;
	addEventListener(
		type: keyof WebSocketListenerMap,
		listener: WebSocketListenerMap[keyof WebSocketListenerMap][number],
	) {
		(
			this.listeners[type] as Array<
				(
					event?:
						| { code: number; reason: string }
						| { message?: string; type?: string }
						| { data: unknown },
				) => void
			>
		).push(listener as (event?: unknown) => void);
	}

	close(code = 1000, reason = "") {
		this.emit("close", { code, reason });
	}

	emit(type: "close", event: { code: number; reason: string }): void;
	emit(type: "error", event: { message?: string; type?: string }): void;
	emit(type: "message", event: { data: unknown }): void;
	emit(type: "open"): void;
	emit(type: keyof WebSocketListenerMap, event?: unknown) {
		for (const listener of this.listeners[type] as Array<
			(event?: unknown) => void
		>) {
			listener(event);
		}
	}

	send(message: string) {
		this.sentMessages.push(message);
	}
}

describe("getExternalTtsConfig", () => {
	test("reads namespaced TTS config from environment", () => {
		const config = getExternalTtsConfig({
			env: {
				EXTERNAL_TTS_API_BASE_URL: "https://example.com/v1/",
				EXTERNAL_TTS_API_MODEL: "tts-1",
				EXTERNAL_TTS_API_KEY: "secret",
			},
		});

		expect(config).toEqual({
			apiBaseUrl: "https://example.com/v1",
			apiKey: "secret",
			model: "tts-1",
		});
	});

	test("falls back to legacy API_* aliases when namespaced TTS config is absent", () => {
		const config = getExternalTtsConfig({
			env: {
				API_BASE_URL: "https://example.com/v1/",
				API_MODEL: "tts-1",
				API_KEY: "secret",
			},
		});

		expect(config).toEqual({
			apiBaseUrl: "https://example.com/v1",
			apiKey: "secret",
			model: "tts-1",
		});
	});

	test("prefers namespaced TTS config over legacy aliases", () => {
		const config = getExternalTtsConfig({
			env: {
				API_BASE_URL: "https://legacy.example.com/v1/",
				API_MODEL: "legacy-tts",
				API_KEY: "legacy-secret",
				EXTERNAL_TTS_API_BASE_URL: "https://example.com/v1/",
				EXTERNAL_TTS_API_MODEL: "tts-1",
				EXTERNAL_TTS_API_KEY: "secret",
			},
		});

		expect(config).toEqual({
			apiBaseUrl: "https://example.com/v1",
			apiKey: "secret",
			model: "tts-1",
		});
	});

	test("throws a clear error when config is incomplete", () => {
		expect(() =>
			getExternalTtsConfig({
				env: {
					API_BASE_URL: "https://example.com/v1",
					API_KEY: "secret",
				},
			}),
		).toThrow("External TTS is not configured");
	});

	test("rejects whitespace-only config values", () => {
		expect(() =>
			getExternalTtsConfig({
				env: {
					API_BASE_URL: "   ",
					API_MODEL: "  ",
					API_KEY: "   ",
				},
			}),
		).toThrow("External TTS is not configured");
	});

	test("rejects malformed API_BASE_URL values", () => {
		expect(() =>
			getExternalTtsConfig({
				env: {
					API_BASE_URL: "not-a-url",
					API_MODEL: "tts-1",
					API_KEY: "secret",
				},
			}),
		).toThrow("External TTS is not configured");
	});

	test("rejects non-http API_BASE_URL schemes", () => {
		expect(() =>
			getExternalTtsConfig({
				env: {
					EXTERNAL_TTS_API_BASE_URL: "mailto:tts@example.com",
					EXTERNAL_TTS_API_MODEL: "tts-1",
					EXTERNAL_TTS_API_KEY: "secret",
				},
			}),
		).toThrow("External TTS is not configured");
	});
});

describe("synthesizeSpeechWithOpenAiCompatible", () => {
	test("posts audio speech requests with the mapped default voice", async () => {
		const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
		const audioBytes = Uint8Array.from([1, 2, 3, 4]);

		const result = await synthesizeSpeechWithOpenAiCompatible({
			config: {
				apiBaseUrl: "https://example.com/v1/",
				apiKey: "secret",
				model: "tts-1",
			},
			text: "你好，Cutia",
			voice: "default",
			fetchImpl: async (input, init) => {
				calls.push({ input, init });
				return new Response(audioBytes, {
					status: 200,
					headers: { "Content-Type": "audio/mpeg" },
				});
			},
		});

		expect(Array.from(new Uint8Array(result))).toEqual([1, 2, 3, 4]);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.input).toBe("https://example.com/v1/audio/speech");

		const headers = new Headers(calls[0]?.init?.headers);
		expect(headers.get("authorization")).toBe("Bearer secret");
		expect(headers.get("content-type")).toBe("application/json");

		expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
			input: "你好，Cutia",
			model: "tts-1",
			response_format: "mp3",
			voice: DEFAULT_EXTERNAL_TTS_VOICE,
		});
	});

	test("surfaces upstream JSON error messages", async () => {
		await expect(
			synthesizeSpeechWithOpenAiCompatible({
				config: {
					apiBaseUrl: "https://example.com/v1",
					apiKey: "secret",
					model: "tts-1",
				},
				text: "hello",
				voice: "nova",
				fetchImpl: async () =>
					Response.json(
						{ error: { message: "quota exceeded" } },
						{ status: 429 },
					),
			}),
		).rejects.toThrow("quota exceeded");
	});

	test("falls back to the root audio speech path when the v1 path returns 404", async () => {
		const calls: string[] = [];
		const cancelledResponses: string[] = [];

		const audio = await synthesizeSpeechWithOpenAiCompatible({
			config: {
				apiBaseUrl: "https://example.com/v1",
				apiKey: "secret",
				model: "tts-1",
			},
			text: "hello",
			voice: "default",
			fetchImpl: async (input) => {
				const url = String(input);
				calls.push(url);

				if (url === "https://example.com/v1/audio/speech") {
					return {
						body: {
							cancel: async () => {
								cancelledResponses.push(url);
							},
						},
						headers: new Headers(),
						ok: false,
						status: 404,
					} as Response;
				}

				return new Response(Uint8Array.from([9, 8, 7]), {
					status: 200,
					headers: { "Content-Type": "audio/mpeg" },
				});
			},
		});

		expect(Array.from(new Uint8Array(audio))).toEqual([9, 8, 7]);
		expect(calls).toEqual([
			"https://example.com/v1/audio/speech",
			"https://example.com/audio/speech",
		]);
		expect(cancelledResponses).toEqual(["https://example.com/v1/audio/speech"]);
	});

	test("tries the /v1 speech endpoint first when the base url is root-level", async () => {
		const calls: string[] = [];

		const audio = await synthesizeSpeechWithOpenAiCompatible({
			config: {
				apiBaseUrl: "https://example.com",
				apiKey: "secret",
				model: "tts-1",
			},
			text: "hello",
			voice: "default",
			fetchImpl: async (input) => {
				const url = String(input);
				calls.push(url);

				if (url === "https://example.com/v1/audio/speech") {
					return new Response(Uint8Array.from([5, 4, 3]), {
						status: 200,
						headers: { "Content-Type": "audio/mpeg" },
					});
				}

				return new Response("not found", { status: 404 });
			},
		});

		expect(Array.from(new Uint8Array(audio))).toEqual([5, 4, 3]);
		expect(calls[0]).toBe("https://example.com/v1/audio/speech");
	});

	test("rejects non-audio success responses", async () => {
		let cancelCalled = false;

		await expect(
			synthesizeSpeechWithOpenAiCompatible({
				config: {
					apiBaseUrl: "https://example.com/v1",
					apiKey: "secret",
					model: "tts-1",
				},
				text: "hello",
				voice: "default",
				fetchImpl: async () =>
					({
						body: {
							cancel: async () => {
								cancelCalled = true;
							},
						},
						headers: new Headers({
							"Content-Type": "text/plain; charset=utf-8",
						}),
						ok: true,
						status: 200,
					}) as Response,
			}),
		).rejects.toThrow("Expected audio response");

		expect(cancelCalled).toBe(true);
	});

	test("rejects success responses when the content-type header is missing", async () => {
		await expect(
			synthesizeSpeechWithOpenAiCompatible({
				config: {
					apiBaseUrl: "https://example.com/v1",
					apiKey: "secret",
					model: "tts-1",
				},
				text: "hello",
				voice: "default",
				fetchImpl: async () =>
					new Response(Uint8Array.from([1, 2, 3]), {
						status: 200,
					}),
			}),
		).rejects.toThrow("Expected audio response");
	});

	test("accepts audio responses when MIME type casing and parameters vary", async () => {
		const audio = await synthesizeSpeechWithOpenAiCompatible({
			config: {
				apiBaseUrl: "https://example.com/v1",
				apiKey: "secret",
				model: "tts-1",
			},
			text: "hello",
			voice: "default",
			fetchImpl: async () =>
				new Response(Uint8Array.from([1, 2, 3]), {
					status: 200,
					headers: { "Content-Type": "Audio/MPEG; Charset=utf-8" },
				}),
		});

		expect(Array.from(new Uint8Array(audio))).toEqual([1, 2, 3]);
	});

	test("wraps arrayBuffer read failures as non-retryable upstream errors", async () => {
		const response = new Response(Uint8Array.from([1, 2, 3]), {
			status: 200,
			headers: { "Content-Type": "audio/mpeg" },
		});
		Object.defineProperty(response, "arrayBuffer", {
			value: async () => {
				throw new Error("stream failed");
			},
		});

		await expect(
			synthesizeSpeechWithOpenAiCompatible({
				config: {
					apiBaseUrl: "https://example.com/v1",
					apiKey: "secret",
					model: "tts-1",
				},
				text: "hello",
				voice: "default",
				fetchImpl: async () => response,
			}),
		).rejects.toMatchObject({
			code: "EXTERNAL_TTS_UPSTREAM",
			message: "External TTS audio read failed: stream failed",
			retryable: false,
			status: 200,
		});
	});

	test("aborts upstream requests that exceed the timeout", async () => {
		await expect(
			synthesizeSpeechWithOpenAiCompatible({
				config: {
					apiBaseUrl: "https://example.com/v1",
					apiKey: "secret",
					model: "tts-1",
				},
				text: "hello",
				voice: "default",
				timeoutMs: 10,
				fetchImpl: async (_input, init) =>
					new Promise((_resolve, reject) => {
						init?.signal?.addEventListener(
							"abort",
							() => reject(new Error("aborted")),
							{ once: true },
						);
					}),
			}),
		).rejects.toMatchObject({
			code: "EXTERNAL_TTS_UPSTREAM",
			message: "External TTS request timed out",
		});
	});

	test("surfaces upstream text errors when JSON is unavailable", async () => {
		await expect(
			synthesizeSpeechWithOpenAiCompatible({
				config: {
					apiBaseUrl: "https://example.com/v1",
					apiKey: "secret",
					model: "tts-1",
				},
				text: "hello",
				voice: "nova",
				fetchImpl: async () =>
					new Response("gateway timeout", {
						status: 504,
						headers: { "Content-Type": "text/plain" },
					}),
			}),
		).rejects.toThrow("gateway timeout");
	});

	test("marks auth failures as non-retryable upstream errors", async () => {
		await expect(
			synthesizeSpeechWithOpenAiCompatible({
				config: {
					apiBaseUrl: "https://example.com/v1",
					apiKey: "secret",
					model: "tts-1",
				},
				text: "hello",
				voice: "default",
				fetchImpl: async () =>
					Response.json(
						{ error: { message: "invalid api key" } },
						{ status: 401, statusText: "Unauthorized" },
					),
			}),
		).rejects.toMatchObject({
			code: "EXTERNAL_TTS_UPSTREAM",
			message: "External TTS request failed: invalid api key",
			retryable: false,
			status: 401,
		});
	});

	test("falls back to the raw upstream body when JSON shape is unrecognized", async () => {
		await expect(
			synthesizeSpeechWithOpenAiCompatible({
				config: {
					apiBaseUrl: "https://example.com/v1",
					apiKey: "secret",
					model: "tts-1",
				},
				text: "hello",
				voice: "nova",
				fetchImpl: async () =>
					new Response('{"message":"bad request"}', {
						status: 400,
						headers: { "Content-Type": "application/json" },
					}),
			}),
		).rejects.toThrow('{"message":"bad request"}');
	});

	test("falls back to /responses websocket audio when /audio/speech returns 404", async () => {
		const sockets: FakeWebSocket[] = [];
		const synthesis = synthesizeSpeechWithOpenAiCompatible({
			config: {
				apiBaseUrl: "https://example.com/v1",
				apiKey: "secret",
				model: "tts-1",
			},
			text: "hello",
			voice: "default",
			createWebSocket: (url, init) => {
				const socket = new FakeWebSocket(url, init);
				sockets.push(socket);
				return socket;
			},
			fetchImpl: async () => new Response("page not found", { status: 404 }),
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(sockets).toHaveLength(1);
		expect(sockets[0]?.url).toBe("wss://example.com/v1/responses");
		expect(sockets[0]?.init?.headers?.Authorization).toBe("Bearer secret");

		sockets[0]?.emit("open");
		expect(JSON.parse(sockets[0]?.sentMessages[0] ?? "")).toEqual({
			audio: { format: "mp3" },
			input: "hello",
			model: "tts-1",
			output_modalities: ["audio"],
			response: {
				instructions: "hello",
				modalities: ["audio"],
				output_audio_format: "mp3",
				voice: DEFAULT_EXTERNAL_TTS_VOICE,
			},
			type: "response.create",
		});
		sockets[0]?.emit("message", {
			data: JSON.stringify({
				type: "response.audio.delta",
				delta: Buffer.from(Uint8Array.from([7, 8, 9])).toString("base64"),
			}),
		});
		sockets[0]?.emit("message", {
			data: JSON.stringify({ type: "response.completed" }),
		});

		expect(Array.from(new Uint8Array(await synthesis))).toEqual([7, 8, 9]);
	});

	test("falls back to /responses websocket audio when /audio/speech returns html", async () => {
		const sockets: FakeWebSocket[] = [];
		let cancelCalled = false;
		const synthesis = synthesizeSpeechWithOpenAiCompatible({
			config: {
				apiBaseUrl: "https://example.com/v1",
				apiKey: "secret",
				model: "tts-1",
			},
			text: "hello",
			voice: "echo",
			createWebSocket: (url, init) => {
				const socket = new FakeWebSocket(url, init);
				sockets.push(socket);
				return socket;
			},
			fetchImpl: async () =>
				({
					body: {
						cancel: async () => {
							cancelCalled = true;
						},
					},
					headers: new Headers({
						"Content-Type": "text/html; charset=utf-8",
					}),
					ok: true,
					status: 200,
				}) as Response,
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(cancelCalled).toBe(true);
		sockets[0]?.emit("open");
		sockets[0]?.emit("message", {
			data: JSON.stringify({
				type: "response.output_audio.delta",
				delta: Buffer.from(Uint8Array.from([1, 2, 3, 4])).toString("base64"),
			}),
		});
		sockets[0]?.emit("message", {
			data: JSON.stringify({ type: "response.done" }),
		});

		expect(Array.from(new Uint8Array(await synthesis))).toEqual([1, 2, 3, 4]);
		expect(JSON.parse(sockets[0]?.sentMessages[0] ?? "").response.voice).toBe(
			"echo",
		);
	});

	test("marks websocket account exhaustion as retryable so legacy fallback can recover", async () => {
		const sockets: FakeWebSocket[] = [];
		const synthesis = synthesizeSpeechWithOpenAiCompatible({
			config: {
				apiBaseUrl: "https://example.com/v1",
				apiKey: "secret",
				model: "tts-1",
			},
			text: "hello",
			voice: "default",
			createWebSocket: (url, init) => {
				const socket = new FakeWebSocket(url, init);
				sockets.push(socket);
				return socket;
			},
			fetchImpl: async () => new Response("page not found", { status: 404 }),
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		sockets[0]?.emit("open");
		sockets[0]?.emit("close", {
			code: 1013,
			reason: "no available account",
		});

		await expect(synthesis).rejects.toMatchObject({
			code: "EXTERNAL_TTS_UPSTREAM",
			message: "External TTS websocket request failed: no available account",
			retryable: true,
		});
	});
});
