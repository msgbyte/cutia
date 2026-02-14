import { useEditor } from "@/hooks/use-editor";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { getSnappedSeekTime } from "@/lib/time";
import { Bookmark02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface TimelineBookmarksRowProps {
	zoomLevel: number;
	dynamicTimelineWidth: number;
	handleWheel: (e: React.WheelEvent) => void;
	handleTimelineContentClick: (e: React.MouseEvent) => void;
	handleRulerTrackingMouseDown: (e: React.MouseEvent) => void;
	handleRulerMouseDown: (e: React.MouseEvent) => void;
}

export function TimelineBookmarksRow({
	zoomLevel,
	dynamicTimelineWidth,
	handleWheel,
	handleTimelineContentClick,
	handleRulerTrackingMouseDown,
	handleRulerMouseDown,
}: TimelineBookmarksRowProps) {
	const editor = useEditor();
	const activeScene = editor.scenes.getActiveScene();

	return (
		<div className="relative h-4 flex-1 overflow-hidden">
			<button
				className="relative h-4 w-full cursor-default select-none border-0 bg-transparent p-0"
				style={{
					width: `${dynamicTimelineWidth}px`,
				}}
				aria-label="Timeline ruler"
				type="button"
				onWheel={handleWheel}
				onClick={handleTimelineContentClick}
				onMouseDown={(event) => {
					handleRulerMouseDown(event);
					handleRulerTrackingMouseDown(event);
				}}
			>
				{activeScene.bookmarks.map((time: number) => (
					<TimelineBookmark
						key={`bookmark-row-${time}`}
						time={time}
						zoomLevel={zoomLevel}
					/>
				))}
			</button>
		</div>
	);
}

export function TimelineBookmark({
	time,
	zoomLevel,
}: {
	time: number;
	zoomLevel: number;
}) {
	const editor = useEditor();
	const activeProject = editor.project.getActive();
	const duration = editor.timeline.getTotalDuration();

	const handleBookmarkActivate = ({
		event,
	}: {
		event:
			| React.MouseEvent<HTMLButtonElement>
			| React.KeyboardEvent<HTMLButtonElement>;
	}) => {
		event.stopPropagation();
		const framesPerSecond = activeProject?.settings.fps ?? 30;
		const snappedTime = getSnappedSeekTime({
			rawTime: time,
			duration,
			fps: framesPerSecond,
		});
		editor.playback.seek({ time: snappedTime });
	};

	return (
		<button
			className="absolute top-0 h-10 w-0.5 cursor-pointer border-0 bg-transparent p-0"
			style={{
				left: `${time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
			}}
			aria-label={`Seek to bookmark at ${time}s`}
			type="button"
			onMouseDown={(event) => {
				event.preventDefault();
				event.stopPropagation();
			}}
			onClick={(event) => handleBookmarkActivate({ event })}
			onKeyDown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				handleBookmarkActivate({ event });
			}}
		>
			<div className="text-primary absolute top-[-1px] left-[-5px]">
				<HugeiconsIcon
					icon={Bookmark02Icon}
					aria-hidden="true"
					className="fill-primary size-3"
				/>
			</div>
		</button>
	);
}
