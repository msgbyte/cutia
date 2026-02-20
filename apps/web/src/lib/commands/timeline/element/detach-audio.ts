import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import { EditorCore } from "@/core";
import { buildEmptyTrack } from "@/lib/timeline/track-utils";
import { getDefaultInsertIndexForTrack } from "@/lib/timeline/track-utils";

export class DetachAudioCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private previousSelection: { trackId: string; elementId: string }[] = [];

	constructor(
		private elements: { trackId: string; elementId: string }[],
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();
		this.previousSelection = editor.selection.getSelectedElements();

		let updatedTracks = [...this.savedState];

		for (const { trackId, elementId } of this.elements) {
			const track = updatedTracks.find((t) => t.id === trackId);
			if (!track || track.type !== "video") continue;

			const element = track.elements.find((el) => el.id === elementId);
			if (!element || element.type !== "video") continue;

			const mediaAssets = editor.media.getAssets();
			const mediaAsset = mediaAssets.find((a) => a.id === element.mediaId);
			if (!mediaAsset || mediaAsset.type !== "video") continue;

			const audioElement = {
				id: generateUUID(),
				type: "audio" as const,
				sourceType: "upload" as const,
				mediaId: element.mediaId,
				name: `${element.name} (audio)`,
				startTime: element.startTime,
				duration: element.duration,
				trimStart: element.trimStart,
				trimEnd: element.trimEnd,
				volume: 1,
				muted: false,
			};

			updatedTracks = updatedTracks.map((t) => {
				if (t.id !== trackId) return t;
				return {
					...t,
					elements: t.elements.map((el) =>
						el.id === elementId ? { ...el, muted: true } : el,
					),
				} as typeof t;
			});

			const existingAudioTrack = updatedTracks.find(
				(t) => t.type === "audio",
			);

			if (existingAudioTrack) {
				updatedTracks = updatedTracks.map((t) => {
					if (t.id !== existingAudioTrack.id) return t;
					return {
						...t,
						elements: [...t.elements, audioElement],
					} as typeof t;
				});
			} else {
				const newTrack = buildEmptyTrack({
					id: generateUUID(),
					type: "audio",
				});
				const trackWithElement = {
					...newTrack,
					elements: [audioElement],
				} as TimelineTrack;

				const insertIndex = getDefaultInsertIndexForTrack({
					tracks: updatedTracks,
					trackType: "audio",
				});
				updatedTracks.splice(insertIndex, 0, trackWithElement);
			}
		}

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
			editor.selection.setSelectedElements({
				elements: this.previousSelection,
			});
		}
	}
}
