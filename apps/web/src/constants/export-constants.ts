import type { ExportOptions } from "@/types/export";

export const DEFAULT_EXPORT_OPTIONS = {
	format: "mp4",
	quality: "high",
	includeAudio: true,
} satisfies ExportOptions;

export const EXPORT_MIME_TYPES = {
	webm: "video/webm",
	mp4: "video/mp4",
} as const;
