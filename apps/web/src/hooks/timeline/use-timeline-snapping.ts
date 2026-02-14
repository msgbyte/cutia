import { useCallback } from "react";
import type { TimelineTrack } from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

export interface SnapPoint {
	time: number;
	type: "element-start" | "element-end" | "playhead";
	elementId?: string;
	trackId?: string;
}

export interface SnapResult {
	snappedTime: number;
	snapPoint: SnapPoint | null;
	snapDistance: number;
}

export interface UseTimelineSnappingOptions {
	snapThreshold?: number;
	enableElementSnapping?: boolean;
	enablePlayheadSnapping?: boolean;
}

export function useTimelineSnapping({
	snapThreshold = 10,
	enableElementSnapping = true,
	enablePlayheadSnapping = true,
}: UseTimelineSnappingOptions = {}) {
	const findSnapPoints = useCallback(
		({
			tracks,
			playheadTime,
			excludeElementId,
		}: {
			tracks: Array<TimelineTrack>;
			playheadTime: number;
			excludeElementId?: string;
		}): SnapPoint[] => {
			const snapPoints: SnapPoint[] = [];

			if (enableElementSnapping) {
				for (const track of tracks) {
					for (const element of track.elements) {
						if (element.id === excludeElementId) continue;

						const elementStart = element.startTime;
						const elementEnd = element.startTime + element.duration;

						snapPoints.push(
							{
								time: elementStart,
								type: "element-start",
								elementId: element.id,
								trackId: track.id,
							},
							{
								time: elementEnd,
								type: "element-end",
								elementId: element.id,
								trackId: track.id,
							},
						);
					}
				}
			}

			if (enablePlayheadSnapping) {
				snapPoints.push({
					time: playheadTime,
					type: "playhead",
				});
			}

			return snapPoints;
		},
		[enableElementSnapping, enablePlayheadSnapping],
	);

	const snapToNearestPoint = useCallback(
		({
			targetTime,
			snapPoints,
			zoomLevel,
		}: {
			targetTime: number;
			snapPoints: Array<SnapPoint>;
			zoomLevel: number;
		}): SnapResult => {
			const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
			const thresholdInSeconds = snapThreshold / pixelsPerSecond;

			let closestSnapPoint: SnapPoint | null = null;
			let closestDistance = Infinity;

			for (const snapPoint of snapPoints) {
				const distance = Math.abs(targetTime - snapPoint.time);
				if (distance < thresholdInSeconds && distance < closestDistance) {
					closestDistance = distance;
					closestSnapPoint = snapPoint;
				}
			}

			return {
				snappedTime: closestSnapPoint ? closestSnapPoint.time : targetTime,
				snapPoint: closestSnapPoint,
				snapDistance: closestDistance,
			};
		},
		[snapThreshold],
	);

	const snapElementEdge = useCallback(
		({
			targetTime,
			elementDuration,
			tracks,
			playheadTime,
			zoomLevel,
			excludeElementId,
			snapToStart = true,
		}: {
			targetTime: number;
			elementDuration: number;
			tracks: Array<TimelineTrack>;
			playheadTime: number;
			zoomLevel: number;
			excludeElementId?: string;
			snapToStart?: boolean;
		}): SnapResult => {
			const snapPoints = findSnapPoints({
				tracks,
				playheadTime,
				excludeElementId,
			});

			const effectiveTargetTime = snapToStart
				? targetTime
				: targetTime + elementDuration;
			const snapResult = snapToNearestPoint({
				targetTime: effectiveTargetTime,
				snapPoints,
				zoomLevel,
			});

			if (!snapToStart && snapResult.snapPoint) {
				snapResult.snappedTime = snapResult.snappedTime - elementDuration;
			}

			return snapResult;
		},
		[findSnapPoints, snapToNearestPoint],
	);

	return {
		snapElementEdge,
		findSnapPoints,
		snapToNearestPoint,
	};
}
