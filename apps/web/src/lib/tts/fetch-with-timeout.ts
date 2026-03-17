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
	const callerSignal = init?.signal;
	let didTimeout = false;
	const abortFromCaller = () => controller.abort(callerSignal?.reason);

	if (callerSignal?.aborted) {
		if (callerSignal.reason instanceof Error) {
			throw callerSignal.reason;
		}

		throw new Error(String(callerSignal.reason ?? "Request aborted"));
	}

	callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

	const timeoutId = setTimeout(() => {
		didTimeout = true;
		controller.abort(new Error(timeoutMessage));
	}, timeoutMs);

	try {
		return await fetchImpl(input, {
			...init,
			signal: controller.signal,
		});
	} catch (error) {
		if (didTimeout) {
			throw new Error(timeoutMessage);
		}

		if (callerSignal?.aborted) {
			if (callerSignal.reason instanceof Error) {
				throw callerSignal.reason;
			}

			throw new Error(String(callerSignal.reason ?? "Request aborted"));
		}

		throw error;
	} finally {
		clearTimeout(timeoutId);
		callerSignal?.removeEventListener("abort", abortFromCaller);
	}
}
