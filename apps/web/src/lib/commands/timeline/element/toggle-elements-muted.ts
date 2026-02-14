import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { canElementHaveAudio } from "@/lib/timeline/element-utils";
import { EditorCore } from "@/core";

export class ToggleElementsMutedCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(private elements: { trackId: string; elementId: string }[]) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const mutableElements = this.elements.filter(({ trackId, elementId }) => {
			const track = this.savedState?.find((t) => t.id === trackId);
			const element = track?.elements.find((e) => e.id === elementId);
			return element && canElementHaveAudio(element);
		});

		if (mutableElements.length === 0) {
			return;
		}

		const shouldMute = mutableElements.some(({ trackId, elementId }) => {
			const track = this.savedState?.find((t) => t.id === trackId);
			const element = track?.elements.find((e) => e.id === elementId);
			return element && canElementHaveAudio(element) && !element.muted;
		});

		const updatedTracks = this.savedState.map((track) => {
			const newElements = track.elements.map((element) => {
				const shouldUpdate = mutableElements.some(
					({ trackId, elementId }) =>
						track.id === trackId && element.id === elementId,
				);
				return shouldUpdate &&
					canElementHaveAudio(element) &&
					element.muted !== shouldMute
					? { ...element, muted: shouldMute }
					: element;
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
