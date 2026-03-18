import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { TtsError } from "@/lib/tts/errors";

let synthesizeImpl: typeof import("@/lib/tts/provider").synthesizeSpeechWithFallback;
const originalConsoleError = console.error;

mock.module("@cutia/env/web", () => ({
	webEnv: {
		API_BASE_URL: "https://example.com/v1",
		API_MODEL: "tts-1",
		API_KEY: "secret",
	},
}));

mock.module("@/lib/tts/provider", () => ({
	synthesizeSpeechWithFallback: (args: Parameters<typeof synthesizeImpl>[0]) =>
		synthesizeImpl(args),
}));

const { POST } = await import("./route");

function createRequest(body: unknown): Request {
	return new Request("http://localhost/api/tts/generate", {
		body: JSON.stringify(body),
		headers: {
			"content-type": "application/json",
		},
		method: "POST",
	});
}

describe("POST /api/tts/generate", () => {
	beforeEach(() => {
		console.error = mock(() => {});
		synthesizeImpl = async () => Uint8Array.from([1, 2, 3]).buffer;
	});

	afterEach(() => {
		console.error = originalConsoleError;
	});

	test("returns base64 audio for successful synthesis", async () => {
		const response = await POST(createRequest({ text: "hello" }) as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			audio: "AQID",
		});
	});

	test("returns 502 for structured legacy upstream errors without relying on message prefixes", async () => {
		synthesizeImpl = async () => {
			throw new TtsError({
				code: "LEGACY_TTS_UPSTREAM",
				message: "legacy fallback audio download failed",
			});
		};

		const response = await POST(createRequest({ text: "hello" }) as never);

		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({
			error: "legacy fallback audio download failed",
		});
	});

	test("returns 502 for structured external upstream errors without relying on message prefixes", async () => {
		synthesizeImpl = async () => {
			throw new TtsError({
				code: "EXTERNAL_TTS_UPSTREAM",
				message: "upstream gateway timeout",
			});
		};

		const response = await POST(createRequest({ text: "hello" }) as never);

		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({
			error: "upstream gateway timeout",
		});
	});

	test("returns the original config error message for structured config failures", async () => {
		synthesizeImpl = async () => {
			throw new TtsError({
				code: "EXTERNAL_TTS_CONFIG",
				message: "external config missing",
			});
		};

		const response = await POST(createRequest({ text: "hello" }) as never);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			error: "external config missing",
		});
	});
});
