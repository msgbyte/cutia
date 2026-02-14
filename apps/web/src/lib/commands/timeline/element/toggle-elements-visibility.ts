import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { canElementBeHidden } from "@/lib/timeline/element-utils";
import { EditorCore } from "@/core";

export class ToggleElementsVisibilityCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(private elements: { trackId: string; elementId: string }[]) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const shouldHide = this.elements.some(({ trackId, elementId }) => {
			const track = this.savedState?.find((t) => t.id === trackId);
			const element = track?.elements.find((e) => e.id === elementId);
			return element && canElementBeHidden(element) && !element.hidden;
		});

		const updatedTracks = this.savedState.map((track) => {
			const newElements = track.elements.map((element) => {
				const shouldUpdate = this.elements.some(
					({ trackId, elementId }) =>
						track.id === trackId && element.id === elementId,
				);
				return shouldUpdate &&
					canElementBeHidden(element) &&
					element.hidden !== shouldHide
					? { ...element, hidden: shouldHide }
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
