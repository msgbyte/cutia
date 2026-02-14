import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { EditorCore } from "@/core";
import { isMainTrack } from "@/lib/timeline";

export class DeleteElementsCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(private elements: { trackId: string; elementId: string }[]) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = this.savedState
			.map((track) => {
				const hasElementsToDelete = this.elements.some(
					(el) => el.trackId === track.id,
				);

				if (!hasElementsToDelete) {
					return track;
				}

				return {
					...track,
					elements: track.elements.filter(
						(element) =>
							!this.elements.some(
								(el) => el.trackId === track.id && el.elementId === element.id,
							),
					),
				} as typeof track;
			})
			.filter((track) => track.elements.length > 0 || isMainTrack(track));

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
