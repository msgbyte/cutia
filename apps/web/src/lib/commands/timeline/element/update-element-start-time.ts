import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { EditorCore } from "@/core";
import { enforceMainTrackStart } from "@/lib/timeline/track-utils";

export class UpdateElementStartTimeCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(
		private elements: { trackId: string; elementId: string }[],
		private startTime: number,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const currentTracks = this.savedState;
		const updatedTracks = currentTracks.map((track) => {
			const hasElementsToUpdate = this.elements.some(
				(el) => el.trackId === track.id,
			);

			if (!hasElementsToUpdate) {
				return track;
			}

			const newElements = track.elements.map((element) => {
				const shouldUpdate = this.elements.some(
					(el) => el.elementId === element.id && el.trackId === track.id,
				);
				if (!shouldUpdate) {
					return element;
				}

				const baseStartTime = Math.max(0, this.startTime);
				const adjustedStartTime = enforceMainTrackStart({
					tracks: currentTracks,
					targetTrackId: track.id,
					requestedStartTime: baseStartTime,
					excludeElementId: element.id,
				});

				return { ...element, startTime: adjustedStartTime };
			});
			return { ...track, elements: newElements } as typeof track;
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
