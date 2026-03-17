import { describe, expect, test } from "bun:test";
import { fetchWithTimeout } from "./fetch-with-timeout";

describe("fetchWithTimeout", () => {
	test("rejects immediately when the caller signal is already aborted", async () => {
		const controller = new AbortController();
		const callerError = new Error("caller aborted");
		let fetchCalled = false;

		controller.abort(callerError);

		await expect(
			fetchWithTimeout({
				fetchImpl: async () => {
					fetchCalled = true;
					return new Response("ok");
				},
				init: { signal: controller.signal },
				input: "https://example.com",
				timeoutMessage: "timed out",
				timeoutMs: 50,
			}),
		).rejects.toThrow("caller aborted");

		expect(fetchCalled).toBe(false);
	});

	test("surfaces caller cancellation for in-flight requests", async () => {
		const controller = new AbortController();
		const callerError = new Error("caller aborted");

		await expect(
			fetchWithTimeout({
				fetchImpl: async (_input, init) =>
					new Promise((_resolve, reject) => {
						setTimeout(() => controller.abort(callerError), 0);

						init?.signal?.addEventListener(
							"abort",
							() => reject(init.signal?.reason ?? new Error("aborted")),
							{ once: true },
						);
					}),
				init: { signal: controller.signal },
				input: "https://example.com",
				timeoutMessage: "timed out",
				timeoutMs: 50,
			}),
		).rejects.toThrow("caller aborted");
	});
});
