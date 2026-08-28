import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { MediaAsset } from "@/types/assets";
import { generateUUID } from "@/utils/id";
import { storageService } from "@/services/storage/service";

export class AddMediaAssetCommand extends Command {
	private assetId: string;
	private createdAsset: MediaAsset | null = null;
	private storageOperation = Promise.resolve();

	constructor(
		private projectId: string,
		private asset: Omit<MediaAsset, "id">,
		private skipNextSave = false,
	) {
		super();
		this.assetId = generateUUID();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		if (!this.createdAsset) {
			this.createdAsset = { ...this.asset, id: this.assetId };
		}
		const createdAsset = this.createdAsset;

		editor.media.setAssets({
			assets: [
				...editor.media.getAssets().filter(({ id }) => id !== this.assetId),
				createdAsset,
			],
		});

		if (this.skipNextSave) {
			this.skipNextSave = false;
			return;
		}

		this.storageOperation = this.storageOperation
			.then(() =>
				storageService.saveMediaAsset({
					projectId: this.projectId,
					mediaAsset: createdAsset,
				}),
			)
			.catch((error) => {
				console.error("Failed to save media item:", error);
			});
	}

	undo(): void {
		if (!this.createdAsset) return;

		const editor = EditorCore.getInstance();
		editor.media.setAssets({
			assets: editor.media.getAssets().filter(({ id }) => id !== this.assetId),
		});

		this.storageOperation = this.storageOperation
			.then(() =>
				storageService.deleteMediaAsset({
					projectId: this.projectId,
					id: this.assetId,
				}),
			)
			.catch((error) => {
				console.error("Failed to delete media item on undo:", error);
			});
	}

	getAssetId(): string {
		return this.assetId;
	}
}
