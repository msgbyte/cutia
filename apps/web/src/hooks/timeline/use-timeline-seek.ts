import { useCallback, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { getSnappedSeekTime } from "@/lib/time";
import { useEditor } from "../use-editor";

interface UseTimelineSeekProps {
	playheadRef: RefObject<HTMLDivElement | null>;
	trackLabelsRef: RefObject<HTMLDivElement | null>;
	rulerScrollRef: RefObject<HTMLDivElement | null>;
	tracksScrollRef: RefObject<HTMLDivElement | null>;
	zoomLevel: number;
	duration: number;
	isSelecting: boolean;
	clearSelectedElements: () => void;
	seek: (time: number) => void;
}

function resetMouseTracking({
	mouseTrackingRef,
}: {
	mouseTrackingRef: MutableRefObject<{
		isMouseDown: boolean;
		downX: number;
		downY: number;
		downTime: number;
	}>;
}) {
	mouseTrackingRef.current = {
		isMouseDown: false,
		downX: 0,
		downY: 0,
		downTime: 0,
	};
}

function setMouseTracking({
	mouseTrackingRef,
	event,
}: {
	mouseTrackingRef: MutableRefObject<{
		isMouseDown: boolean;
		downX: number;
		downY: number;
		downTime: number;
	}>;
	event: React.MouseEvent;
}) {
	mouseTrackingRef.current = {
		isMouseDown: true,
		downX: event.clientX,
		downY: event.clientY,
		downTime: event.timeStamp,
	};
}

export function useTimelineSeek({
	playheadRef,
	trackLabelsRef,
	rulerScrollRef,
	tracksScrollRef,
	zoomLevel,
	duration,
	isSelecting,
	clearSelectedElements,
	seek,
}: UseTimelineSeekProps) {
	const editor = useEditor();
	const activeProject = editor.project.getActive();

	const mouseTrackingRef = useRef({
		isMouseDown: false,
		downX: 0,
		downY: 0,
		downTime: 0,
	});

	const handleTracksMouseDown = useCallback((event: React.MouseEvent) => {
		if (event.button !== 0) return;
		setMouseTracking({ mouseTrackingRef, event });
	}, []);

	const handleRulerMouseDown = useCallback((event: React.MouseEvent) => {
		if (event.button !== 0) return;
		setMouseTracking({ mouseTrackingRef, event });
	}, []);

	const shouldProcessTimelineClick = useCallback(
		({ event }: { event: React.MouseEvent }) => {
			const target = event.target as HTMLElement;
			const { isMouseDown, downX, downY, downTime } = mouseTrackingRef.current;
			const deltaX = Math.abs(event.clientX - downX);
			const deltaY = Math.abs(event.clientY - downY);
			const deltaTime = event.timeStamp - downTime;
			const isPlayhead = !!playheadRef.current?.contains(target);
			const isTrackLabels = !!trackLabelsRef.current?.contains(target);
			const shouldBlockForDrag = deltaX > 5 || deltaY > 5 || deltaTime > 500;

			if (!isMouseDown) return false;
			if (shouldBlockForDrag) return false;
			if (isSelecting) return false;
			if (isPlayhead) return false;
			if (isTrackLabels) {
				clearSelectedElements();
				return false;
			}

			return true;
		},
		[isSelecting, clearSelectedElements, playheadRef, trackLabelsRef],
	);

	const handleTimelineSeek = useCallback(
		({
			event,
			source,
		}: {
			event: React.MouseEvent;
			source: "ruler" | "tracks";
		}) => {
			const scrollContainer =
				source === "ruler" ? rulerScrollRef.current : tracksScrollRef.current;

			if (!scrollContainer) return;

			const rect = scrollContainer.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;
			const scrollLeft = scrollContainer.scrollLeft;

			const rawTime = Math.max(
				0,
				Math.min(
					duration,
					(mouseX + scrollLeft) /
						(TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
				),
			);

			const projectFps = activeProject?.settings.fps || 30;
			const time = getSnappedSeekTime({
				rawTime,
				duration,
				fps: projectFps,
			});
			seek(time);
			editor.project.setTimelineViewState({
				viewState: {
					zoomLevel,
					scrollLeft: scrollContainer.scrollLeft,
					playheadTime: time,
				},
			});
		},
		[
			duration,
			zoomLevel,
			rulerScrollRef,
			tracksScrollRef,
			seek,
			editor,
			activeProject?.settings.fps,
		],
	);

	const handleTracksClick = useCallback(
		(event: React.MouseEvent) => {
			const shouldProcess = shouldProcessTimelineClick({ event });
			resetMouseTracking({ mouseTrackingRef });

			if (shouldProcess) {
				clearSelectedElements();
				handleTimelineSeek({ event, source: "tracks" });
			}
		},
		[shouldProcessTimelineClick, handleTimelineSeek, clearSelectedElements],
	);

	const handleRulerClick = useCallback(
		(event: React.MouseEvent) => {
			const shouldProcess = shouldProcessTimelineClick({ event });
			resetMouseTracking({ mouseTrackingRef });

			if (shouldProcess) {
				clearSelectedElements();
				handleTimelineSeek({ event, source: "ruler" });
			}
		},
		[shouldProcessTimelineClick, handleTimelineSeek, clearSelectedElements],
	);

	return {
		handleTracksMouseDown,
		handleTracksClick,
		handleRulerMouseDown,
		handleRulerClick,
	};
}
