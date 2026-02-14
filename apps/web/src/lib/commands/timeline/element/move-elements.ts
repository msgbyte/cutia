import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type {
	TimelineTrack,
	TimelineElement,
	TrackType,
} from "@/types/timeline";
import {
	buildEmptyTrack,
	isMainTrack,
	validateElementTrackCompatibility,
	enforceMainTrackStart,
} from "@/lib/timeline/track-utils";

export class MoveElementCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(
		private sourceTrackId: string,
		private targetTrackId: string,
		private elementId: string,
		private newStartTime: number,
		private createTrack?: { type: TrackType; index: number },
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const sourceTrack = this.savedState.find(
			(t) => t.id === this.sourceTrackId,
		);
		const element = sourceTrack?.elements.find(
			(el) => el.id === this.elementId,
		);

		if (!sourceTrack || !element) {
			console.error("Source track or element not found");
			return;
		}

		let targetTrack = this.savedState.find((t) => t.id === this.targetTrackId);
		let tracksToUpdate = this.savedState;
		if (!targetTrack && this.createTrack) {
			const newTrack = buildEmptyTrack({
				id: this.targetTrackId,
				type: this.createTrack.type,
			});
			tracksToUpdate = [...this.savedState];
			tracksToUpdate.splice(this.createTrack.index, 0, newTrack);
			targetTrack = newTrack;
		}
		if (!targetTrack) {
			console.error("Target track not found");
			return;
		}

		const validation = validateElementTrackCompatibility({
			element,
			track: targetTrack,
		});

		if (!validation.isValid) {
			console.error(validation.errorMessage);
			return;
		}

		const adjustedStartTime = enforceMainTrackStart({
			tracks: tracksToUpdate,
			targetTrackId: this.targetTrackId,
			requestedStartTime: this.newStartTime,
			excludeElementId: this.elementId,
		});

		const movedElement: TimelineElement = {
			...element,
			startTime: adjustedStartTime,
		};

		const isSameTrack = this.sourceTrackId === this.targetTrackId;

		let updatedTracks = tracksToUpdate.map((track) => {
			if (isSameTrack && track.id === this.sourceTrackId) {
				return {
					...track,
					elements: track.elements.map((el) =>
						el.id === this.elementId ? movedElement : el,
					),
				};
			}

			if (track.id === this.sourceTrackId) {
				return {
					...track,
					elements: track.elements.filter((el) => el.id !== this.elementId),
				};
			}

			if (track.id === this.targetTrackId) {
				return {
					...track,
					elements: [...track.elements, movedElement],
				};
			}

			return track;
		}) as TimelineTrack[];

		if (!isSameTrack) {
			const sourceTrackAfterMove = updatedTracks.find(
				(track) => track.id === this.sourceTrackId,
			);
			if (
				sourceTrackAfterMove &&
				sourceTrackAfterMove.elements.length === 0 &&
				!isMainTrack(sourceTrackAfterMove)
			) {
				updatedTracks = updatedTracks.filter(
					(track) => track.id !== this.sourceTrackId,
				);
			}
		}

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
