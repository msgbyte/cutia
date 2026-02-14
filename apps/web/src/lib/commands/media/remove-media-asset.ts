import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { MediaAsset } from "@/types/assets";
import { storageService } from "@/services/storage/service";
import { videoCache } from "@/services/video-cache/service";
import { hasMediaId } from "@/lib/timeline/element-utils";
import type { TimelineTrack } from "@/types/timeline";

export class RemoveMediaAssetCommand extends Command {
	private savedAssets: MediaAsset[] | null = null;
	private savedTracks: TimelineTrack[] | null = null;
	private removedAsset: MediaAsset | null = null;

	constructor(
		private projectId: string,
		private assetId: string,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		const assets = editor.media.getAssets();

		this.savedAssets = [...assets];
		this.savedTracks = editor.timeline.getTracks();

		this.removedAsset =
			assets.find((media) => media.id === this.assetId) ?? null;

		if (!this.removedAsset) {
			console.error("Media asset not found:", this.assetId);
			return;
		}

		videoCache.clearVideo({ mediaId: this.assetId });

		editor.media.setAssets({
			assets: assets.filter((media) => media.id !== this.assetId),
		});

		const elementsToRemove: Array<{ trackId: string; elementId: string }> = [];

		for (const track of this.savedTracks) {
			for (const element of track.elements) {
				if (hasMediaId(element) && element.mediaId === this.assetId) {
					elementsToRemove.push({ trackId: track.id, elementId: element.id });
				}
			}
		}

		if (elementsToRemove.length > 0) {
			editor.timeline.deleteElements({ elements: elementsToRemove });
		}

		storageService
			.deleteMediaAsset({ projectId: this.projectId, id: this.assetId })
			.catch((error) => {
				console.error("Failed to delete media item:", error);
			});
	}

	undo(): void {
		const editor = EditorCore.getInstance();

		if (this.savedAssets) {
			editor.media.setAssets({ assets: this.savedAssets });
		}

		if (this.savedTracks) {
			editor.timeline.updateTracks(this.savedTracks);
		}

		if (this.removedAsset) {
			storageService
				.saveMediaAsset({
					projectId: this.projectId,
					mediaAsset: this.removedAsset,
				})
				.catch((error) => {
					console.error("Failed to restore media item on undo:", error);
				});
		}
	}
}
