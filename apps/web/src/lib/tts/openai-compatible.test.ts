import { describe, expect, test } from "bun:test";
import {
	DEFAULT_EXTERNAL_TTS_VOICE,
	getExternalTtsConfig,
	synthesizeSpeechWithOpenAiCompatible,
} from "./openai-compatible";

describe("getExternalTtsConfig", () => {
	test("reads required config from environment", () => {
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
					return new Response("page not found", { status: 404 });
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
					new Response("<!doctype html>", {
						status: 200,
						headers: { "Content-Type": "text/html; charset=utf-8" },
					}),
			}),
		).rejects.toThrow("Expected audio response");
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
});
