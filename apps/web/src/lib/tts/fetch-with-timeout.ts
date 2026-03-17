type FetchLike = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

export async function fetchWithTimeout({
	fetchImpl,
	input,
	init,
	timeoutMs,
	timeoutMessage,
}: {
	fetchImpl: FetchLike;
	input: RequestInfo | URL;
	init?: RequestInit;
	timeoutMs: number;
	timeoutMessage: string;
}): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetchImpl(input, {
			...init,
			signal: controller.signal,
		});
	} catch (error) {
		if (controller.signal.aborted) {
			throw new Error(timeoutMessage);
		}

		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}
