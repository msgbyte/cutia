import type { EditorCore } from "@/core";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import {
	AddMediaAssetCommand,
	BatchCommand,
	type Command,
	InsertElementCommand,
} from "@/lib/commands";
import { i18next } from "@/lib/i18n";
import { buildImageElement } from "@/lib/timeline/element-utils";
import { storageService } from "@/services/storage/service";
import { processMediaAssets } from "./processing";

export async function importClipboardImages({
	editor,
	files,
	startTime,
}: {
	editor: EditorCore;
	files: File[];
	startTime: number;
}): Promise<void> {
	const images = files.filter((file) => file.type.startsWith("image/"));
	if (images.length === 0) return;
	const projectId = editor.project.getActive().metadata.id;
	const sceneId = editor.scenes.getActiveScene().id;
	const assets = await processMediaAssets({ files: images });
	const savedIds: string[] = [];
	const commands: Command[] = [];
	try {
		for (const asset of assets) {
			const media = new AddMediaAssetCommand(projectId, asset, true);
			const id = media.getAssetId();
			savedIds.push(id);
			await storageService.saveMediaAsset({
				projectId,
				mediaAsset: { ...asset, id },
			});
			commands.push(
				media,
				new InsertElementCommand({
					placement: { mode: "auto" },
					element: buildImageElement({
						mediaId: id,
						name: asset.name,
						startTime,
						duration: TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
					}),
				}),
			);
		}
		if (
			editor.project.getActiveOrNull()?.metadata.id !== projectId ||
			editor.scenes.getActiveScene().id !== sceneId
		) {
			throw new Error(
				i18next.t("The active project or scene changed. Please import again."),
			);
		}
		if (commands.length > 0) {
			editor.command.execute({ command: new BatchCommand(commands) });
		}
	} catch (error) {
		await Promise.all(
			savedIds.map((id) =>
				storageService
					.deleteMediaAsset({ projectId, id })
					.catch(() => undefined),
			),
		);
		for (const asset of assets) {
			if (asset.url) URL.revokeObjectURL(asset.url);
		}
		throw error;
	}
}
