export const TTS_ERROR_CODES = [
	"EXTERNAL_TTS_CONFIG",
	"EXTERNAL_TTS_UPSTREAM",
	"LEGACY_TTS_UPSTREAM",
] as const;

export type TtsErrorCode = (typeof TTS_ERROR_CODES)[number];

export class TtsError extends Error {
	code: TtsErrorCode;
	retryable?: boolean;
	status?: number;

	constructor({
		code,
		message,
		retryable,
		status,
	}: {
		code: TtsErrorCode;
		message: string;
		retryable?: boolean;
		status?: number;
	}) {
		super(message);
		this.name = "TtsError";
		this.code = code;
		this.retryable = retryable;
		this.status = status;
	}
}

export function isTtsError(error: unknown): error is TtsError {
	if (!(error instanceof Error)) {
		return false;
	}

	return TTS_ERROR_CODES.includes((error as TtsError).code);
}
