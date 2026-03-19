import {
	getExternalTtsConfig,
	synthesizeSpeechWithOpenAiCompatible,
} from "./openai-compatible";
import { isTtsError } from "./errors";
import { synthesizeSpeechWithLegacyProvider } from "./legacy";

type TtsEnv = {
	API_BASE_URL?: string;
	API_MODEL?: string;
	API_KEY?: string;
};

export async function synthesizeSpeechWithFallback({
	env,
	text,
	voice,
	openAiSynthesize = synthesizeSpeechWithOpenAiCompatible,
	legacySynthesize = synthesizeSpeechWithLegacyProvider,
}: {
	env: TtsEnv;
	text: string;
	voice?: string;
	openAiSynthesize?: typeof synthesizeSpeechWithOpenAiCompatible;
	legacySynthesize?: typeof synthesizeSpeechWithLegacyProvider;
}): Promise<ArrayBuffer> {
	try {
		const config = getExternalTtsConfig({ env });
		return await openAiSynthesize({ config, text, voice });
	} catch (error) {
		if (isTtsError(error) && error.code === "EXTERNAL_TTS_CONFIG") {
			throw error;
		}

		if (
			!isTtsError(error) ||
			error.code !== "EXTERNAL_TTS_UPSTREAM" ||
			error.retryable === false
		) {
			throw error;
		}

		return legacySynthesize({ text, voice });
	}
}
