import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { EditorCore } from "@/core";
import { canTracktHaveAudio } from "@/lib/timeline";

export class ToggleTrackMuteCommand extends Command {
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
		if (!targetTrack) {
			return;
		}

		const updatedTracks = this.savedState.map((track) =>
			track.id === this.trackId && canTracktHaveAudio(track)
				? { ...track, muted: !track.muted }
				: track,
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
