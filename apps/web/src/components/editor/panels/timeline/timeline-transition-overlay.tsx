"use client";

import { useState, useRef, useCallback } from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import {
	TRANSITION_PRESETS,
	DEFAULT_TRANSITION_DURATION,
} from "@/constants/transition-constants";
import type {
	VideoTrack,
	TrackTransition,
	VideoElement,
	ImageElement,
	TransitionType,
} from "@/types/timeline";
import { useEditor } from "@/hooks/use-editor";
import {
	findAdjacentPairs,
	getTransitionForPair,
} from "@/lib/timeline/transition-utils";
import { cn } from "@/utils/ui";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type VisualElement = VideoElement | ImageElement;

const MIN_TRANSITION_DURATION = 0.1;
const MAX_TRANSITION_DURATION = 2.0;

function getElementEndTime({ element }: { element: VisualElement }): number {
	return element.startTime + element.duration;
}

export function TrackTransitionOverlays({
	track,
	zoomLevel,
}: {
	track: VideoTrack;
	zoomLevel: number;
}) {
	const pairs = findAdjacentPairs({ track });

	return (
		<>
			{pairs.map((pair) => {
				const transition = getTransitionForPair({
					track,
					fromElementId: pair.from.id,
					toElementId: pair.to.id,
				});

				return (
					<TransitionJunctionOverlay
						key={`${pair.from.id}:${pair.to.id}`}
						track={track}
						fromElement={pair.from}
						toElement={pair.to}
						transition={transition}
						zoomLevel={zoomLevel}
					/>
				);
			})}
		</>
	);
}

function TransitionJunctionOverlay({
	track,
	fromElement,
	toElement,
	transition,
	zoomLevel,
}: {
	track: VideoTrack;
	fromElement: VisualElement;
	toElement: VisualElement;
	transition: TrackTransition | null;
	zoomLevel: number;
}) {
	const editor = useEditor();
	const [isOpen, setIsOpen] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [dragDuration, setDragDuration] = useState<number | null>(null);
	const dragRef = useRef<{
		startX: number;
		startDuration: number;
		side: "left" | "right";
	} | null>(null);

	const pixelsPerSecond =
		TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
	const junctionTime = getElementEndTime({ element: fromElement });
	const junctionPx = junctionTime * pixelsPerSecond;

	const maxDuration = Math.min(
		fromElement.duration,
		toElement.duration,
		MAX_TRANSITION_DURATION,
	);

	const displayDuration = dragDuration ?? transition?.duration ?? 0;

	const handleSelectTransition = ({ type }: { type: TransitionType }) => {
		editor.timeline.addTransition({
			trackId: track.id,
			fromElementId: fromElement.id,
			toElementId: toElement.id,
			type,
			duration: transition?.duration ?? DEFAULT_TRANSITION_DURATION,
		});
	};

	const handleRemoveTransition = () => {
		if (!transition) return;
		editor.timeline.removeTransition({
			trackId: track.id,
			transitionId: transition.id,
		});
		setIsOpen(false);
	};

	const clampDuration = useCallback(
		({ duration }: { duration: number }): number => {
			return Math.max(
				MIN_TRANSITION_DURATION,
				Math.min(duration, maxDuration),
			);
		},
		[maxDuration],
	);

	const handleDragStart = useCallback(
		({
			event,
			side,
		}: {
			event: React.PointerEvent;
			side: "left" | "right";
		}) => {
			if (!transition) return;
			event.preventDefault();
			event.stopPropagation();

			dragRef.current = {
				startX: event.clientX,
				startDuration: transition.duration,
				side,
			};
			setIsDragging(true);
			(event.target as HTMLElement).setPointerCapture(event.pointerId);
		},
		[transition],
	);

	const handleDragMove = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			if (!dragRef.current || !transition) return;

			const { startX, startDuration, side } = dragRef.current;
			const deltaX = event.clientX - startX;
			// dragging handle outward increases duration
			const deltaDuration =
				(side === "left" ? -deltaX : deltaX) / pixelsPerSecond;
			const newDuration = clampDuration({
				duration: startDuration + deltaDuration,
			});
			setDragDuration(newDuration);
		},
		[transition, pixelsPerSecond, clampDuration],
	);

	const handleDragEnd = useCallback(() => {
		if (!dragRef.current || !transition || dragDuration === null) {
			dragRef.current = null;
			setIsDragging(false);
			setDragDuration(null);
			return;
		}

		editor.timeline.updateTransition({
			trackId: track.id,
			transitionId: transition.id,
			updates: { duration: dragDuration },
		});

		dragRef.current = null;
		setIsDragging(false);
		setDragDuration(null);
	}, [transition, dragDuration, editor, track.id]);

	// no transition: show a small "+" button at the junction
	if (!transition) {
		const buttonSize = 24;
		const leftPx = junctionPx - buttonSize / 2;

		return (
			<div
				className="absolute top-0 z-50 flex h-full items-center"
				style={{ left: `${leftPx}px`, width: `${buttonSize}px` }}
			>
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-sm transition-colors"
							title="Add transition"
						>
							<PlusIcon />
						</button>
					</PopoverTrigger>
					<PopoverContent
						className="w-56 p-0"
						side="top"
						align="center"
						sideOffset={8}
					>
						<TransitionPicker
							currentType={null}
							onSelect={handleSelectTransition}
						/>
					</PopoverContent>
				</Popover>
			</div>
		);
	}

	// has transition: show a resizable overlay centered on the junction
	const overlayWidthPx = displayDuration * pixelsPerSecond;
	const overlayLeftPx = junctionPx - overlayWidthPx / 2;
	const handleWidth = 6;

	return (
		<div
			className="absolute top-0 z-50 flex h-full items-center"
			style={{
				left: `${overlayLeftPx}px`,
				width: `${overlayWidthPx}px`,
			}}
		>
			{/* left drag handle */}
			<div
				className="absolute top-0 left-0 z-10 h-full cursor-ew-resize"
				style={{ width: `${handleWidth}px` }}
				onPointerDown={(event) =>
					handleDragStart({ event, side: "left" })
				}
				onPointerMove={(event) => handleDragMove({ event })}
				onPointerUp={handleDragEnd}
				role="separator"
				aria-valuenow={displayDuration}
				aria-valuemin={MIN_TRANSITION_DURATION}
				aria-valuemax={maxDuration}
				aria-label="Resize transition left"
				tabIndex={0}
				onKeyDown={() => {}}
			/>

			{/* overlay body */}
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className={cn(
							"flex h-full w-full items-center justify-center rounded-sm border transition-colors",
							isDragging
								? "bg-primary/40 border-primary"
								: "bg-primary/20 hover:bg-primary/30 border-primary/50",
						)}
						style={{
							marginLeft: `${handleWidth}px`,
							marginRight: `${handleWidth}px`,
						}}
						title={`${transition.type} (${displayDuration.toFixed(1)}s)`}
					>
						<TransitionDiamondIcon />
						{overlayWidthPx > 50 && (
							<span className="text-foreground ml-1 text-[10px] tabular-nums">
								{displayDuration.toFixed(1)}s
							</span>
						)}
					</button>
				</PopoverTrigger>
				<PopoverContent
					className="w-56 p-0"
					side="top"
					align="center"
					sideOffset={8}
				>
					<TransitionPicker
						currentType={transition.type}
						onSelect={handleSelectTransition}
						onRemove={handleRemoveTransition}
					/>
				</PopoverContent>
			</Popover>

			{/* right drag handle */}
			<div
				className="absolute top-0 right-0 z-10 h-full cursor-ew-resize"
				style={{ width: `${handleWidth}px` }}
				onPointerDown={(event) =>
					handleDragStart({ event, side: "right" })
				}
				onPointerMove={(event) => handleDragMove({ event })}
				onPointerUp={handleDragEnd}
				role="separator"
				aria-valuenow={displayDuration}
				aria-valuemin={MIN_TRANSITION_DURATION}
				aria-valuemax={maxDuration}
				aria-label="Resize transition right"
				tabIndex={0}
				onKeyDown={() => {}}
			/>
		</div>
	);
}

function TransitionPicker({
	currentType,
	onSelect,
	onRemove,
}: {
	currentType: TransitionType | null;
	onSelect: ({ type }: { type: TransitionType }) => void;
	onRemove?: () => void;
}) {
	return (
		<div className="flex flex-col">
			<div className="border-b px-3 py-2">
				<span className="text-xs font-medium">Transitions</span>
			</div>
			<ScrollArea className="max-h-48">
				<div className="grid grid-cols-2 gap-1 p-2">
					{TRANSITION_PRESETS.map((preset) => (
						<button
							key={preset.type}
							type="button"
							className={cn(
								"rounded-sm px-2 py-1.5 text-xs transition-colors",
								currentType === preset.type
									? "bg-primary text-primary-foreground"
									: "hover:bg-accent",
							)}
							onClick={() => onSelect({ type: preset.type })}
						>
							{preset.label}
						</button>
					))}
				</div>
			</ScrollArea>
			{onRemove && (
				<div className="border-t p-2">
					<button
						type="button"
						className="hover:bg-destructive/10 text-destructive w-full rounded-sm px-2 py-1.5 text-xs"
						onClick={onRemove}
					>
						Remove transition
					</button>
				</div>
			)}
		</div>
	);
}

function TransitionDiamondIcon() {
	return (
		<svg viewBox="0 0 12 12" className="size-3">
			<title>Transition</title>
			<path
				d="M6 1 L11 6 L6 11 L1 6 Z"
				fill="currentColor"
				opacity="0.9"
			/>
		</svg>
	);
}

function PlusIcon() {
	return (
		<svg viewBox="0 0 12 12" className="size-3">
			<title>Add transition</title>
			<path
				d="M6 2 V10 M2 6 H10"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				fill="none"
			/>
		</svg>
	);
}
