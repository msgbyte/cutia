import { describe, expect, test } from "bun:test";
import { getChatCompletionsUrl } from "../llm-client";

describe("getChatCompletionsUrl", () => {
	test("uses same-origin proxy for external base urls", () => {
		expect(
			getChatCompletionsUrl({
				baseUrl: "http://120.27.203.19:18080/v1",
			}),
		).toBe("/api/ai/agent/chat?baseUrl=http%3A%2F%2F120.27.203.19%3A18080%2Fv1");
	});

	test("keeps relative base urls on same origin", () => {
		expect(getChatCompletionsUrl({ baseUrl: "/api/openai" })).toBe(
			"/api/openai/chat/completions",
		);
	});

	test("falls back to the default OpenAI base url through the proxy", () => {
		expect(getChatCompletionsUrl({ baseUrl: "" })).toBe(
			"/api/ai/agent/chat?baseUrl=https%3A%2F%2Fapi.openai.com%2Fv1",
		);
	});
});
