import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TimelineTrack } from "@/types/timeline";
import { getMainTrack } from "@/lib/timeline";

export class RemoveTrackCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(private trackId: string) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();
		const targetTrack = this.savedState.find(
			(track) => track.id === this.trackId,
		);
		const mainTrack = getMainTrack({ tracks: this.savedState });
		if (mainTrack?.id === targetTrack?.id) {
			return;
		}
		const updatedTracks = this.savedState.filter(
			(track) => track.id !== this.trackId,
		);
		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
