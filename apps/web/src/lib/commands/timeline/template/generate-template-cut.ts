import { EditorCore } from "@/core";
import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";

export class GenerateTemplateCutCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(private readonly tracks: TimelineTrack[]) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();
		editor.timeline.updateTracks(this.tracks);
	}

	undo(): void {
		if (!this.savedState) {
			return;
		}

		const editor = EditorCore.getInstance();
		editor.timeline.updateTracks(this.savedState);
	}
}
