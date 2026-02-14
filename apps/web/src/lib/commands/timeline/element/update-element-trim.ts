import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { EditorCore } from "@/core";

export class UpdateElementTrimCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(
		private elementId: string,
		private trimStart: number,
		private trimEnd: number,
		private startTime?: number,
		private duration?: number,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = this.savedState.map((track) => {
			const newElements = track.elements.map((element) => {
				if (element.id !== this.elementId) {
					return element;
				}

				return {
					...element,
					trimStart: this.trimStart,
					trimEnd: this.trimEnd,
					startTime: this.startTime ?? element.startTime,
					duration: this.duration ?? element.duration,
				};
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
