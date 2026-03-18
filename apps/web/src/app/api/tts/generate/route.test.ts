import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

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

	test("returns 502 for structured legacy upstream errors without relying on message prefixes", async () => {
		synthesizeImpl = async () => {
			throw Object.assign(new Error("legacy fallback audio download failed"), {
				code: "LEGACY_TTS_UPSTREAM",
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
			throw Object.assign(new Error("upstream gateway timeout"), {
				code: "EXTERNAL_TTS_UPSTREAM",
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
			throw Object.assign(new Error("external config missing"), {
				code: "EXTERNAL_TTS_CONFIG",
			});
		};

		const response = await POST(createRequest({ text: "hello" }) as never);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			error: "external config missing",
		});
	});
});
