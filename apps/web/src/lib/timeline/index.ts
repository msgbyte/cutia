import type { TimelineTrack } from "@/types/timeline";

export * from "./track-utils";
export * from "./element-utils";
export * from "./zoom-utils";
export * from "./ruler-utils";

export function calculateTotalDuration({
	tracks,
}: {
	tracks: TimelineTrack[];
}): number {
	if (tracks.length === 0) return 0;

	const trackEndTimes = tracks.map((track) =>
		track.elements.reduce((maxEnd, element) => {
			const elementEnd = element.startTime + element.duration;
			return Math.max(maxEnd, elementEnd);
		}, 0),
	);

	return Math.max(...trackEndTimes, 0);
}
