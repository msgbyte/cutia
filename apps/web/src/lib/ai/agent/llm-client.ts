import type {
	AgentLLMConfig,
	OpenAIChatCompletionChunk,
	OpenAIChatMessage,
	OpenAIToolSchema,
} from "./types";

export interface StreamCallbacks {
	onContent?: (content: string) => void;
	onToolCall?: (toolCall: {
		index: number;
		id?: string;
		name?: string;
		arguments?: string;
	}) => void;
	onDone?: () => void;
	onError?: (error: Error) => void;
}

export interface ChatCompletionResult {
	content: string;
	toolCalls: Array<{
		id: string;
		name: string;
		arguments: string;
	}>;
}

function normalizeBaseUrl(baseUrl: string) {
	return (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
}

function isRelativeBaseUrl(baseUrl: string) {
	return baseUrl.startsWith("/");
}

export function getChatCompletionsUrl({
	baseUrl,
}: {
	baseUrl: string;
}) {
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

	if (isRelativeBaseUrl(normalizedBaseUrl)) {
		return `${normalizedBaseUrl}/chat/completions`;
	}

	const params = new URLSearchParams({
		baseUrl: normalizedBaseUrl,
	});
	return `/api/ai/agent/chat?${params.toString()}`;
}

export async function streamChatCompletion({
	config,
	messages,
	tools,
	callbacks,
	signal,
}: {
	config: AgentLLMConfig;
	messages: OpenAIChatMessage[];
	tools?: OpenAIToolSchema[];
	callbacks: StreamCallbacks;
	signal?: AbortSignal;
}): Promise<ChatCompletionResult> {
	const url = getChatCompletionsUrl({ baseUrl: config.baseUrl });

	const body: Record<string, unknown> = {
		model: config.model || "gpt-4.1",
		messages,
		stream: true,
	};

	if (tools && tools.length > 0) {
		body.tools = tools;
	}

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${config.apiKey}`,
		},
		body: JSON.stringify(body),
		signal,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`LLM API error (${response.status}): ${errorText}`);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error("No response body");
	}

	const decoder = new TextDecoder();
	let contentAccumulator = "";
	const toolCallAccumulators = new Map<
		number,
		{ id: string; name: string; arguments: string }
	>();
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			// keep last potentially incomplete line
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || !trimmed.startsWith("data: ")) continue;

				const data = trimmed.slice(6);
				if (data === "[DONE]") {
					callbacks.onDone?.();
					continue;
				}

				try {
					const chunk = JSON.parse(data) as OpenAIChatCompletionChunk;
					const choice = chunk.choices[0];
					if (!choice) continue;

					if (choice.delta.content) {
						contentAccumulator += choice.delta.content;
						callbacks.onContent?.(choice.delta.content);
					}

					if (choice.delta.tool_calls) {
						for (const tc of choice.delta.tool_calls) {
							const existing = toolCallAccumulators.get(tc.index);
							if (existing) {
								if (tc.function?.arguments) {
									existing.arguments += tc.function.arguments;
								}
							} else {
								toolCallAccumulators.set(tc.index, {
									id: tc.id ?? "",
									name: tc.function?.name ?? "",
									arguments: tc.function?.arguments ?? "",
								});
							}
							callbacks.onToolCall?.({
								index: tc.index,
								id: tc.id,
								name: tc.function?.name,
								arguments: tc.function?.arguments,
							});
						}
					}
				} catch {
					// skip malformed chunks
				}
			}
		}
	} finally {
		reader.releaseLock();
	}

	const toolCalls = Array.from(toolCallAccumulators.values());

	return {
		content: contentAccumulator,
		toolCalls,
	};
}
