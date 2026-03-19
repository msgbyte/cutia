import { describe, expect, test } from "bun:test";
import { TtsError } from "./errors";
import { synthesizeSpeechWithOpenAiCompatible } from "./openai-compatible";
import { synthesizeSpeechWithFallback } from "./provider";

describe("synthesizeSpeechWithFallback", () => {
	test("returns the configured external provider result when it succeeds", async () => {
		let legacyCalled = false;

		const result = await synthesizeSpeechWithFallback({
			env: {
				EXTERNAL_TTS_API_BASE_URL: "https://example.com/v1",
				EXTERNAL_TTS_API_MODEL: "tts-1",
				EXTERNAL_TTS_API_KEY: "secret",
			},
			text: "hello",
			voice: "default",
			openAiSynthesize: async () => Uint8Array.from([1, 2, 3]).buffer,
			legacySynthesize: async () => {
				legacyCalled = true;
				return Uint8Array.from([9, 9, 9]).buffer;
			},
		});

		expect(Array.from(new Uint8Array(result))).toEqual([1, 2, 3]);
		expect(legacyCalled).toBe(false);
	});

	test("falls back to the legacy provider for structured external upstream errors", async () => {
		let legacyCalled = false;

		const result = await synthesizeSpeechWithFallback({
			env: {
				API_BASE_URL: "https://example.com/v1",
				API_MODEL: "tts-1",
				API_KEY: "secret",
			},
			text: "hello",
			voice: "default",
			openAiSynthesize: async () => {
				throw new TtsError({
					code: "EXTERNAL_TTS_UPSTREAM",
					message:
						"External TTS request failed: Expected audio response, received text/html; charset=utf-8",
				});
			},
			legacySynthesize: async ({ text }) => {
				legacyCalled = true;
				expect(text).toBe("hello");
				return Uint8Array.from([7, 8, 9]).buffer;
			},
		});

		expect(Array.from(new Uint8Array(result))).toEqual([7, 8, 9]);
		expect(legacyCalled).toBe(true);
	});

	test("rethrows unexpected external provider errors instead of silently falling back", async () => {
		let legacyCalled = false;

		await expect(
			synthesizeSpeechWithFallback({
				env: {
					API_BASE_URL: "https://example.com/v1",
					API_MODEL: "tts-1",
					API_KEY: "secret",
				},
				text: "hello",
				voice: "default",
				openAiSynthesize: async () => {
					throw new Error("unexpected provider failure");
				},
				legacySynthesize: async () => {
					legacyCalled = true;
					return Uint8Array.from([7, 8, 9]).buffer;
				},
			}),
		).rejects.toThrow("unexpected provider failure");

		expect(legacyCalled).toBe(false);
	});

	test("rethrows non-retryable external upstream errors instead of falling back", async () => {
		let legacyCalled = false;

		await expect(
			synthesizeSpeechWithFallback({
				env: {
					API_BASE_URL: "https://example.com/v1",
					API_MODEL: "tts-1",
					API_KEY: "secret",
				},
				text: "hello",
				voice: "default",
				openAiSynthesize: async () => {
					throw Object.assign(
						new TtsError({
							code: "EXTERNAL_TTS_UPSTREAM",
							message: "External TTS request failed: invalid api key",
						}),
						{
							retryable: false,
							status: 401,
						},
					);
				},
				legacySynthesize: async () => {
					legacyCalled = true;
					return Uint8Array.from([7, 8, 9]).buffer;
				},
			}),
		).rejects.toMatchObject({
			code: "EXTERNAL_TTS_UPSTREAM",
			retryable: false,
			status: 401,
		});

		expect(legacyCalled).toBe(false);
	});

	test("does not fall back when the external provider returns a non-audio success response", async () => {
		let legacyCalled = false;

		await expect(
			synthesizeSpeechWithFallback({
				env: {
					API_BASE_URL: "https://example.com/v1",
					API_MODEL: "tts-1",
					API_KEY: "secret",
				},
				text: "hello",
				voice: "default",
				openAiSynthesize: ({ config, text, voice }) =>
					synthesizeSpeechWithOpenAiCompatible({
						config,
						text,
						voice,
						fetchImpl: async () =>
							new Response("<!doctype html>", {
								status: 200,
								headers: { "Content-Type": "text/html; charset=utf-8" },
							}),
					}),
				legacySynthesize: async () => {
					legacyCalled = true;
					return Uint8Array.from([7, 8, 9]).buffer;
				},
			}),
		).rejects.toMatchObject({
			code: "EXTERNAL_TTS_UPSTREAM",
			message: "Expected audio response, received text/html; charset=utf-8",
			retryable: false,
		});

		expect(legacyCalled).toBe(false);
	});

	test("rethrows missing external config instead of silently falling back", async () => {
		let openAiCalled = false;
		let legacyCalled = false;

		await expect(
			synthesizeSpeechWithFallback({
				env: {},
				text: "hello",
				voice: "default",
				openAiSynthesize: async () => {
					openAiCalled = true;
					return Uint8Array.from([1]).buffer;
				},
				legacySynthesize: async () => {
					legacyCalled = true;
					return Uint8Array.from([9]).buffer;
				},
			}),
		).rejects.toThrow("External TTS is not configured");

		expect(openAiCalled).toBe(false);
		expect(legacyCalled).toBe(false);
	});

	test("rethrows missing external config with a structured error code", async () => {
		await expect(
			synthesizeSpeechWithFallback({
				env: {},
				text: "hello",
				voice: "default",
			}),
		).rejects.toMatchObject({
			code: "EXTERNAL_TTS_CONFIG",
			message: "External TTS is not configured",
		});
	});
});
