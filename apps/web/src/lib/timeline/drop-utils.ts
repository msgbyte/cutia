import type { TimelineTrack, ElementType } from "@/types/timeline";
import { TRACK_HEIGHTS, TRACK_GAP } from "@/constants/timeline-constants";
import { wouldElementOverlap } from "./element-utils";
import type { ComputeDropTargetParams, DropTarget } from "@/types/timeline";
import { isMainTrack, enforceMainTrackStart } from "./track-utils";

function getTrackAtY({
	mouseY,
	tracks,
	verticalDragDirection,
}: {
	mouseY: number;
	tracks: TimelineTrack[];
	verticalDragDirection?: "up" | "down" | null;
}): { trackIndex: number; relativeY: number } | null {
	let cumulativeHeight = 0;

	for (let i = 0; i < tracks.length; i++) {
		const trackHeight = TRACK_HEIGHTS[tracks[i].type];
		const trackTop = cumulativeHeight;
		const trackBottom = trackTop + trackHeight;

		if (mouseY >= trackTop && mouseY < trackBottom) {
			return {
				trackIndex: i,
				relativeY: mouseY - trackTop,
			};
		}

		if (i < tracks.length - 1 && verticalDragDirection) {
			const gapTop = trackBottom;
			const gapBottom = gapTop + TRACK_GAP;
			if (mouseY >= gapTop && mouseY < gapBottom) {
				const isDraggingUp = verticalDragDirection === "up";
				return {
					trackIndex: isDraggingUp ? i : i + 1,
					relativeY: isDraggingUp ? trackHeight - 1 : 0,
				};
			}
		}

		cumulativeHeight += trackHeight + TRACK_GAP;
	}

	return null;
}

function isCompatible({
	elementType,
	trackType,
}: {
	elementType: ElementType;
	trackType: TimelineTrack["type"];
}): boolean {
	if (elementType === "text") return trackType === "text";
	if (elementType === "audio") return trackType === "audio";
	if (elementType === "sticker") return trackType === "sticker";
	if (elementType === "video" || elementType === "image") {
		return trackType === "video";
	}
	return false;
}

function getMainTrackIndex({ tracks }: { tracks: TimelineTrack[] }): number {
	return tracks.findIndex((track) => isMainTrack(track));
}

function findInsertIndex({
	elementType,
	tracks,
	preferredIndex,
	insertAbove,
}: {
	elementType: ElementType;
	tracks: TimelineTrack[];
	preferredIndex: number;
	insertAbove: boolean;
}): { index: number; position: "above" | "below" } {
	const mainTrackIndex = getMainTrackIndex({ tracks });

	if (elementType === "audio") {
		if (preferredIndex <= mainTrackIndex) {
			return { index: mainTrackIndex + 1, position: "below" };
		}
		return {
			index: insertAbove ? preferredIndex : preferredIndex + 1,
			position: insertAbove ? "above" : "below",
		};
	}

	const overlayInsertIndex = insertAbove ? preferredIndex : preferredIndex + 1;

	if (mainTrackIndex >= 0 && overlayInsertIndex > mainTrackIndex) {
		return { index: mainTrackIndex, position: "above" };
	}

	return {
		index: overlayInsertIndex,
		position: insertAbove ? "above" : "below",
	};
}

export function computeDropTarget({
	elementType,
	mouseX,
	mouseY,
	tracks,
	playheadTime,
	isExternalDrop,
	elementDuration,
	pixelsPerSecond,
	zoomLevel,
	verticalDragDirection,
	startTimeOverride,
	excludeElementId,
}: ComputeDropTargetParams): DropTarget {
	const xPosition =
		typeof startTimeOverride === "number"
			? startTimeOverride
			: isExternalDrop
				? playheadTime
				: Math.max(0, mouseX / (pixelsPerSecond * zoomLevel));

	const mainTrackIndex = getMainTrackIndex({ tracks });

	if (tracks.length === 0) {
		if (elementType === "audio") {
			return {
				trackIndex: 0,
				isNewTrack: true,
				insertPosition: "below",
				xPosition,
			};
		}
		return { trackIndex: 0, isNewTrack: true, insertPosition: null, xPosition };
	}

	const trackAtMouse = getTrackAtY({ mouseY, tracks, verticalDragDirection });

	if (!trackAtMouse) {
		const isAboveAllTracks = mouseY < 0;

		if (elementType === "audio") {
			return {
				trackIndex: tracks.length,
				isNewTrack: true,
				insertPosition: "below",
				xPosition,
			};
		}

		if (isAboveAllTracks) {
			return {
				trackIndex: 0,
				isNewTrack: true,
				insertPosition: "above",
				xPosition,
			};
		}

		return {
			trackIndex: Math.max(0, mainTrackIndex),
			isNewTrack: true,
			insertPosition: "above",
			xPosition,
		};
	}

	const { trackIndex, relativeY } = trackAtMouse;
	const track = tracks[trackIndex];
	const trackHeight = TRACK_HEIGHTS[track.type];
	const isInUpperHalf = relativeY < trackHeight / 2;

	const isTrackCompatible = isCompatible({
		elementType,
		trackType: track.type,
	});

	const endTime = xPosition + elementDuration;
	const hasOverlap = wouldElementOverlap({
		elements: track.elements,
		startTime: xPosition,
		endTime,
		excludeElementId,
	});

	if (isTrackCompatible && !hasOverlap) {
		const targetTrack = tracks[trackIndex];
		// safe: snap to 0 only happens when element becomes the new earliest,
		// meaning the space before the current earliest is empty
		const adjustedXPosition = enforceMainTrackStart({
			tracks,
			targetTrackId: targetTrack.id,
			requestedStartTime: xPosition,
			excludeElementId,
		});

		return {
			trackIndex,
			isNewTrack: false,
			insertPosition: null,
			xPosition: adjustedXPosition,
		};
	}

	let insertAbove = isInUpperHalf;
	if (!isTrackCompatible && verticalDragDirection) {
		insertAbove = verticalDragDirection === "up";
	}

	const { index, position } = findInsertIndex({
		elementType,
		tracks,
		preferredIndex: trackIndex,
		insertAbove,
	});

	return {
		trackIndex: index,
		isNewTrack: true,
		insertPosition: position,
		xPosition,
	};
}

export function getDropLineY({
	dropTarget,
	tracks,
}: {
	dropTarget: DropTarget;
	tracks: TimelineTrack[];
}): number {
	const safeTrackIndex = Math.min(
		Math.max(dropTarget.trackIndex, 0),
		tracks.length,
	);
	let y = 0;

	for (let i = 0; i < safeTrackIndex; i++) {
		y += TRACK_HEIGHTS[tracks[i].type] + TRACK_GAP;
	}

	return y;
}
