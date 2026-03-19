import { describe, expect, test } from "bun:test";
import { synthesizeSpeechWithLegacyProvider } from "./legacy";

describe("synthesizeSpeechWithLegacyProvider", () => {
	test("rejects audio urls outside the expected https host allowlist", async () => {
		const calls: string[] = [];

		await expect(
			synthesizeSpeechWithLegacyProvider({
				text: "hello",
				fetchImpl: async (input) => {
					calls.push(String(input));
					return Response.json({
						code: 200,
						url: "http://127.0.0.1/internal.mp3",
					});
				},
			}),
		).rejects.toThrow("Legacy TTS returned an unexpected audio URL");

		expect(calls).toHaveLength(1);
	});

	test("rejects non-audio content returned by the legacy audio download", async () => {
		await expect(
			synthesizeSpeechWithLegacyProvider({
				text: "hello",
				fetchImpl: async (input) => {
					if (String(input).includes("/apis/mbAIsc?")) {
						return Response.json({
							code: 200,
							url: "https://api.milorapart.top/voice/test.mp3",
						});
					}

					return new Response("<html></html>", {
						status: 200,
						headers: { "Content-Type": "text/html; charset=utf-8" },
					});
				},
			}),
		).rejects.toThrow("Legacy TTS returned non-audio content");
	});

	test("rejects audio downloads when the content-type header is missing", async () => {
		await expect(
			synthesizeSpeechWithLegacyProvider({
				text: "hello",
				fetchImpl: async (input) => {
					if (String(input).includes("/apis/mbAIsc?")) {
						return Response.json({
							code: 200,
							url: "https://api.milorapart.top/voice/test.mp3",
						});
					}

					return new Response(Uint8Array.from([1, 2, 3]), {
						status: 200,
					});
				},
			}),
		).rejects.toThrow("Legacy TTS returned non-audio content");
	});

	test("accepts audio downloads when the MIME type casing and parameters vary", async () => {
		const audio = await synthesizeSpeechWithLegacyProvider({
			text: "hello",
			fetchImpl: async (input) => {
				if (String(input).includes("/apis/mbAIsc?")) {
					return Response.json({
						code: 200,
						url: "https://api.milorapart.top/voice/test.mp3",
					});
				}

				return new Response(Uint8Array.from([1, 2, 3]), {
					status: 200,
					headers: { "Content-Type": "Audio/MPEG; Charset=utf-8" },
				});
			},
		});

		expect(Array.from(new Uint8Array(audio))).toEqual([1, 2, 3]);
	});

	test("rejects redirected audio downloads that leave the allowlist", async () => {
		let sawManualRedirect = false;

		await expect(
			synthesizeSpeechWithLegacyProvider({
				text: "hello",
				fetchImpl: async (input, init) => {
					if (String(input).includes("/apis/mbAIsc?")) {
						return Response.json({
							code: 200,
							url: "https://api.milorapart.top/voice/test.mp3",
						});
					}

					sawManualRedirect = init?.redirect === "manual";

					return new Response(null, {
						status: 302,
						headers: {
							location: "https://evil.example.com/payload.mp3",
						},
					});
				},
			}),
		).rejects.toMatchObject({
			code: "LEGACY_TTS_UPSTREAM",
			message: "Legacy TTS audio download redirected to an unexpected host",
		});

		expect(sawManualRedirect).toBe(true);
	});

	test("follows allowlisted redirects for legacy audio downloads", async () => {
		let downloadCallCount = 0;

		const audio = await synthesizeSpeechWithLegacyProvider({
			text: "hello",
			fetchImpl: async (input, init) => {
				if (String(input).includes("/apis/mbAIsc?")) {
					return Response.json({
						code: 200,
						url: "https://api.milorapart.top/voice/test.mp3",
					});
				}

				downloadCallCount++;

				if (downloadCallCount === 1) {
					expect(init?.redirect).toBe("manual");

					return new Response(null, {
						status: 302,
						headers: {
							location: "https://api.milorapart.top/voice/test-redirected.mp3",
						},
					});
				}

				expect(String(input)).toBe(
					"https://api.milorapart.top/voice/test-redirected.mp3",
				);
				return new Response(Uint8Array.from([4, 5, 6]), {
					status: 200,
					headers: { "Content-Type": "audio/mpeg" },
				});
			},
		});

		expect(downloadCallCount).toBe(2);
		expect(Array.from(new Uint8Array(audio))).toEqual([4, 5, 6]);
	});

	test("rejects synthesis text that would exceed the legacy GET limit", async () => {
		let fetchCalled = false;

		await expect(
			synthesizeSpeechWithLegacyProvider({
				text: "中".repeat(400),
				fetchImpl: async () => {
					fetchCalled = true;
					return Response.json({
						code: 200,
						url: "https://api.milorapart.top/voice/test.mp3",
					});
				},
			}),
		).rejects.toThrow("Legacy TTS text is too long for GET fallback");

		expect(fetchCalled).toBe(false);
	});

	test("aborts the metadata request when the upstream hangs", async () => {
		await expect(
			synthesizeSpeechWithLegacyProvider({
				text: "hello",
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
			code: "LEGACY_TTS_UPSTREAM",
			message: "Legacy TTS request timed out",
		});
	});

	test("aborts the audio download when the legacy audio fetch hangs", async () => {
		let callCount = 0;

		await expect(
			synthesizeSpeechWithLegacyProvider({
				text: "hello",
				timeoutMs: 10,
				fetchImpl: async (_input, init) => {
					callCount++;

					if (callCount === 1) {
						return Response.json({
							code: 200,
							url: "https://api.milorapart.top/voice/test.mp3",
						});
					}

					return new Promise((_resolve, reject) => {
						init?.signal?.addEventListener(
							"abort",
							() => reject(new Error("aborted")),
							{ once: true },
						);
					});
				},
			}),
		).rejects.toMatchObject({
			code: "LEGACY_TTS_UPSTREAM",
			message: "Legacy TTS audio download timed out",
		});
	});
});
