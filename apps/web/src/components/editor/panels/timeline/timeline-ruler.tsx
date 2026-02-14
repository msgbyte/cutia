import { type JSX, useLayoutEffect, useRef } from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { DEFAULT_FPS } from "@/constants/project-constants";
import { useEditor } from "@/hooks/use-editor";
import { getRulerConfig, shouldShowLabel } from "@/lib/timeline/ruler-utils";
import { useScrollPosition } from "@/hooks/timeline/use-scroll-position";
import { TimelineTick } from "./timeline-tick";

interface TimelineRulerProps {
	zoomLevel: number;
	dynamicTimelineWidth: number;
	rulerRef: React.Ref<HTMLDivElement>;
	tracksScrollRef: React.RefObject<HTMLElement | null>;
	handleWheel: (e: React.WheelEvent) => void;
	handleTimelineContentClick: (e: React.MouseEvent) => void;
	handleRulerTrackingMouseDown: (e: React.MouseEvent) => void;
	handleRulerMouseDown: (e: React.MouseEvent) => void;
}

export function TimelineRuler({
	zoomLevel,
	dynamicTimelineWidth,
	rulerRef,
	tracksScrollRef,
	handleWheel,
	handleTimelineContentClick,
	handleRulerTrackingMouseDown,
	handleRulerMouseDown,
}: TimelineRulerProps) {
	const editor = useEditor();
	const duration = editor.timeline.getTotalDuration();
	const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
	const visibleDuration = dynamicTimelineWidth / pixelsPerSecond;
	const effectiveDuration = Math.max(duration, visibleDuration);
	const project = editor.project.getActive();
	const fps = project?.settings.fps ?? DEFAULT_FPS;
	const { labelIntervalSeconds, tickIntervalSeconds } = getRulerConfig({
		zoomLevel,
		fps,
	});
	const tickCount = Math.ceil(effectiveDuration / tickIntervalSeconds) + 1;

	const { scrollLeft, viewportWidth } = useScrollPosition({
		scrollRef: tracksScrollRef,
	});

	/**
	 * widens the virtualization buffer during zoom transitions.
	 * useScrollPosition lags one frame behind the scroll adjustment
	 * that useLayoutEffect applies after a zoom change.
	 */
	const prevZoomRef = useRef(zoomLevel);
	const isZoomTransition = zoomLevel !== prevZoomRef.current;
	const bufferPx = isZoomTransition
		? Math.max(200, (scrollLeft + viewportWidth) * 0.15)
		: 200;

	useLayoutEffect(() => {
		prevZoomRef.current = zoomLevel;
	}, [zoomLevel]);

	const visibleStartTime = Math.max(
		0,
		(scrollLeft - bufferPx) / pixelsPerSecond,
	);
	const visibleEndTime =
		(scrollLeft + viewportWidth + bufferPx) / pixelsPerSecond;

	const startTickIndex = Math.max(
		0,
		Math.floor(visibleStartTime / tickIntervalSeconds),
	);
	const endTickIndex = Math.min(
		tickCount - 1,
		Math.ceil(visibleEndTime / tickIntervalSeconds),
	);

	const timelineTicks: Array<JSX.Element> = [];
	for (
		let tickIndex = startTickIndex;
		tickIndex <= endTickIndex;
		tickIndex += 1
	) {
		const time = tickIndex * tickIntervalSeconds;
		if (time > effectiveDuration) break;

		const showLabel = shouldShowLabel({ time, labelIntervalSeconds });
		timelineTicks.push(
			<TimelineTick
				key={tickIndex}
				time={time}
				zoomLevel={zoomLevel}
				fps={fps}
				showLabel={showLabel}
			/>,
		);
	}

	return (
		<div
			role="slider"
			tabIndex={0}
			aria-label="Timeline ruler"
			aria-valuemin={0}
			aria-valuemax={effectiveDuration}
			aria-valuenow={0}
			className="relative h-4 flex-1 overflow-x-visible"
			onWheel={handleWheel}
			onClick={handleTimelineContentClick}
			onMouseDown={handleRulerTrackingMouseDown}
			onKeyDown={() => {}}
		>
			<div
				role="none"
				ref={rulerRef}
				className="relative h-4 cursor-default select-none"
				style={{
					width: `${dynamicTimelineWidth}px`,
				}}
				onMouseDown={handleRulerMouseDown}
			>
				{timelineTicks}
			</div>
		</div>
	);
}
