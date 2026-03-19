import { describe, expect, test } from "bun:test";
import { fetchWithTimeout } from "./fetch-with-timeout";

describe("fetchWithTimeout", () => {
	test("resolves successfully when fetch completes before the timeout", async () => {
		let fetchCalled = false;

		const response = await fetchWithTimeout({
			fetchImpl: async () => {
				fetchCalled = true;
				return new Response("ok", { status: 200 });
			},
			input: "https://example.com",
			timeoutMessage: "timed out",
			timeoutMs: 50,
		});

		expect(fetchCalled).toBe(true);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("ok");
	});

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

	test("rejects with the timeout message when fetch exceeds timeoutMs", async () => {
		await expect(
			fetchWithTimeout({
				fetchImpl: async (_input, init) =>
					new Promise((_resolve, reject) => {
						init?.signal?.addEventListener(
							"abort",
							() => reject(new Error("aborted")),
							{ once: true },
						);
					}),
				input: "https://example.com",
				timeoutMessage: "timed out",
				timeoutMs: 10,
			}),
		).rejects.toThrow("timed out");
	});
});
