export interface VoicePack {
	id: string;
	name: string;
}

export const VOICE_PACKS: VoicePack[] = [{ id: "default", name: "Default" }];

export const DEFAULT_VOICE_PACK = "default";
export const DEFAULT_EXTERNAL_TTS_VOICE = "alloy";
