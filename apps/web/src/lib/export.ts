import { EXPORT_MIME_TYPES } from "@/constants/export-constants";
import type { ExportFormat } from "@/types/export";

export function getExportMimeType({
	format,
}: {
	format: ExportFormat;
}): string {
	return EXPORT_MIME_TYPES[format];
}

export function getExportFileExtension({
	format,
}: {
	format: ExportFormat;
}): string {
	return `.${format}`;
}
