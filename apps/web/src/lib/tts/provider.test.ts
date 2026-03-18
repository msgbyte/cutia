import { describe, expect, test } from "bun:test";
import { synthesizeSpeechWithFallback } from "./provider";

describe("synthesizeSpeechWithFallback", () => {
	test("returns the configured external provider result when it succeeds", async () => {
		let legacyCalled = false;

		const result = await synthesizeSpeechWithFallback({
			env: {
				API_BASE_URL: "https://example.com/v1",
				API_MODEL: "tts-1",
				API_KEY: "secret",
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

	test("falls back to the legacy provider when the configured provider is unsupported", async () => {
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
				throw new Error(
					"External TTS request failed: Expected audio response, received text/html; charset=utf-8",
				);
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
