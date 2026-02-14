import { LANGUAGES } from "@/constants/language-constants";
import type {
	TranscriptionModel,
	TranscriptionModelId,
} from "@/types/transcription";
import type { LanguageCode } from "@/types/language";

const SUPPORTED_TRANSCRIPTION_LANGS: ReadonlyArray<LanguageCode> = [
	"en",
	"es",
	"it",
	"fr",
	"de",
	"pt",
	"ru",
	"ja",
	"zh",
];

export const TRANSCRIPTION_LANGUAGES = LANGUAGES.filter((language) =>
	SUPPORTED_TRANSCRIPTION_LANGS.includes(language.code),
);

export const TRANSCRIPTION_MODELS: TranscriptionModel[] = [
	{
		id: "whisper-tiny",
		name: "Tiny",
		huggingFaceId: "onnx-community/whisper-tiny",
		description: "Fastest, lower accuracy",
	},
	{
		id: "whisper-small",
		name: "Small",
		huggingFaceId: "onnx-community/whisper-small",
		description: "Good balance of speed and accuracy",
	},
	{
		id: "whisper-medium",
		name: "Medium",
		huggingFaceId: "onnx-community/whisper-medium",
		description: "Higher accuracy, slower",
	},
	{
		id: "whisper-large-v3-turbo",
		name: "Large v3 Turbo",
		huggingFaceId: "onnx-community/whisper-large-v3-turbo",
		description: "Best accuracy, requires WebGPU for good performance",
	},
];

export const DEFAULT_TRANSCRIPTION_MODEL: TranscriptionModelId =
	"whisper-small";

export const DEFAULT_CHUNK_LENGTH_SECONDS = 30;
export const DEFAULT_STRIDE_SECONDS = 5;

export const DEFAULT_WORDS_PER_CAPTION = 3;
export const MIN_CAPTION_DURATION_SECONDS = 0.8;
