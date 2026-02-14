import type {
	VideoTrack,
	TrackTransition,
	VideoElement,
	ImageElement,
} from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import type { TransitionType } from "@/types/timeline";

type VisualElement = VideoElement | ImageElement;

// element.duration is already the visible duration on the timeline
function getElementEndTime({
	element,
}: {
	element: VisualElement;
}): number {
	return element.startTime + element.duration;
}

const ADJACENCY_EPSILON = 0.05;

export function areElementsAdjacent({
	elementA,
	elementB,
}: {
	elementA: VisualElement;
	elementB: VisualElement;
}): boolean {
	const endA = getElementEndTime({ element: elementA });
	const gap = Math.abs(elementB.startTime - endA);
	return gap < ADJACENCY_EPSILON;
}

export function findAdjacentPairs({
	track,
}: {
	track: VideoTrack;
}): Array<{ from: VisualElement; to: VisualElement }> {
	const sorted = [...track.elements].sort(
		(a, b) => a.startTime - b.startTime,
	);
	const pairs: Array<{ from: VisualElement; to: VisualElement }> = [];

	for (let i = 0; i < sorted.length - 1; i++) {
		const current = sorted[i];
		const next = sorted[i + 1];
		if (areElementsAdjacent({ elementA: current, elementB: next })) {
			pairs.push({ from: current, to: next });
		}
	}

	return pairs;
}

export function getTransitionForPair({
	track,
	fromElementId,
	toElementId,
}: {
	track: VideoTrack;
	fromElementId: string;
	toElementId: string;
}): TrackTransition | null {
	const transitions = track.transitions ?? [];
	return (
		transitions.find(
			(transition) =>
				transition.fromElementId === fromElementId &&
				transition.toElementId === toElementId,
		) ?? null
	);
}

export function buildTrackTransition({
	type,
	duration,
	fromElementId,
	toElementId,
}: {
	type: TransitionType;
	duration: number;
	fromElementId: string;
	toElementId: string;
}): TrackTransition {
	return {
		id: generateUUID(),
		type,
		duration,
		fromElementId,
		toElementId,
	};
}

export function addTransitionToTrack({
	track,
	transition,
}: {
	track: VideoTrack;
	transition: TrackTransition;
}): VideoTrack {
	const transitions = track.transitions ?? [];
	const existing = transitions.find(
		(t) =>
			t.fromElementId === transition.fromElementId &&
			t.toElementId === transition.toElementId,
	);
	if (existing) {
		return {
			...track,
			transitions: transitions.map((t) =>
				t.id === existing.id ? transition : t,
			),
		};
	}
	return {
		...track,
		transitions: [...transitions, transition],
	};
}

export function removeTransitionFromTrack({
	track,
	transitionId,
}: {
	track: VideoTrack;
	transitionId: string;
}): VideoTrack {
	const transitions = track.transitions ?? [];
	return {
		...track,
		transitions: transitions.filter((t) => t.id !== transitionId),
	};
}

export function cleanupTransitionsForTrack({
	track,
}: {
	track: VideoTrack;
}): VideoTrack {
	const transitions = track.transitions ?? [];
	const elementIds = new Set(track.elements.map((element) => element.id));
	const pairs = findAdjacentPairs({ track });
	const validPairKeys = new Set(
		pairs.map((p) => `${p.from.id}:${p.to.id}`),
	);

	const validTransitions = transitions.filter((transition) => {
		const bothExist =
			elementIds.has(transition.fromElementId) &&
			elementIds.has(transition.toElementId);
		const stillAdjacent = validPairKeys.has(
			`${transition.fromElementId}:${transition.toElementId}`,
		);
		return bothExist && stillAdjacent;
	});

	if (validTransitions.length === transitions.length) {
		return track;
	}

	return { ...track, transitions: validTransitions };
}
