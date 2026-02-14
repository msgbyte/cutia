import { useCallback, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useSyncExternalStore } from "react";
import type {
	Transform,
	TimelineTrack,
	TimelineElement,
} from "@/types/timeline";
import { hitTestElements } from "@/lib/preview/hit-test";

type ScaleHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface DragState {
	startX: number;
	startY: number;
	tracksSnapshot: TimelineTrack[];
	elements: Array<{
		trackId: string;
		elementId: string;
		initialTransform: Transform;
	}>;
}

interface ScaleState {
	startX: number;
	startY: number;
	handle: ScaleHandle;
	tracksSnapshot: TimelineTrack[];
	trackId: string;
	elementId: string;
	initialTransform: Transform;
	anchorX: number;
	anchorY: number;
}

export function usePreviewInteraction({
	canvasRef,
	overlayRef,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	overlayRef: React.RefObject<HTMLDivElement | null>;
}) {
	const editor = useEditor();
	const [isDragging, setIsDragging] = useState(false);
	const [isScaling, setIsScaling] = useState(false);
	const dragStateRef = useRef<DragState | null>(null);
	const scaleStateRef = useRef<ScaleState | null>(null);
	const scalePointerIdRef = useRef<number | null>(null);

	const selectedElements = useSyncExternalStore(
		(listener) => editor.selection.subscribe(listener),
		() => editor.selection.getSelectedElements(),
	);

	const getCanvasCoordinates = useCallback(
		({ clientX, clientY }: { clientX: number; clientY: number }) => {
			if (!canvasRef.current) return { x: 0, y: 0 };

			const rect = canvasRef.current.getBoundingClientRect();
			const logicalWidth = canvasRef.current.width;
			const logicalHeight = canvasRef.current.height;
			const scaleX = logicalWidth / rect.width;
			const scaleY = logicalHeight / rect.height;

			const canvasX = (clientX - rect.left) * scaleX;
			const canvasY = (clientY - rect.top) * scaleY;

			return { x: canvasX, y: canvasY };
		},
		[canvasRef],
	);

	const handlePointerDown = useCallback(
		(event: React.PointerEvent) => {
			const startPos = getCanvasCoordinates({
				clientX: event.clientX,
				clientY: event.clientY,
			});

			const canvasWidth = canvasRef.current?.width ?? 0;
			const canvasHeight = canvasRef.current?.height ?? 0;
			const tracks = editor.timeline.getTracks();
			const mediaAssets = editor.media.getAssets();
			const currentTime = editor.playback.getCurrentTime();

			// hit-test all visible elements at the click point
			const hitResult = hitTestElements({
				point: startPos,
				tracks,
				mediaAssets,
				canvasWidth,
				canvasHeight,
				currentTime,
			});

			if (!hitResult) {
				editor.selection.clearSelection();
				return;
			}

			const isAlreadySelected = selectedElements.some(
				(selected) =>
					selected.trackId === hitResult.trackId &&
					selected.elementId === hitResult.element.id,
			);

			// clicking an unselected element → select only that element
			if (!isAlreadySelected) {
				editor.selection.setSelectedElements({
					elements: [
						{
							trackId: hitResult.trackId,
							elementId: hitResult.element.id,
						},
					],
				});

				dragStateRef.current = {
					startX: startPos.x,
					startY: startPos.y,
					tracksSnapshot: tracks,
					elements: [
						{
							trackId: hitResult.trackId,
							elementId: hitResult.element.id,
							initialTransform: hitResult.transform,
						},
					],
				};
			} else {
				// already selected → drag all selected elements
				const elementsWithTracks = editor.timeline.getElementsWithTracks({
					elements: selectedElements,
				});

				const draggableElements = elementsWithTracks.filter(
					({ element }) =>
						element.type === "video" ||
						element.type === "image" ||
						element.type === "text" ||
						element.type === "sticker",
				);

				if (draggableElements.length === 0) return;

				dragStateRef.current = {
					startX: startPos.x,
					startY: startPos.y,
					tracksSnapshot: tracks,
					elements: draggableElements.map(({ track, element }) => ({
						trackId: track.id,
						elementId: element.id,
						initialTransform: (element as { transform: Transform })
							.transform,
					})),
				};
			}

			setIsDragging(true);
			event.currentTarget.setPointerCapture(event.pointerId);
		},
		[selectedElements, editor, getCanvasCoordinates, canvasRef],
	);

	const handleScaleStart = useCallback(
		({
			event,
			handle,
			element,
			trackId,
		}: {
			event: React.PointerEvent;
			handle: ScaleHandle;
			element: TimelineElement;
			trackId: string;
		}) => {
			if (element.type === "audio") return;

			const startPos = getCanvasCoordinates({
				clientX: event.clientX,
				clientY: event.clientY,
			});
			const transform = (element as { transform: Transform }).transform;

			const canvasWidth = canvasRef.current?.width ?? 0;
			const canvasHeight = canvasRef.current?.height ?? 0;
			const anchorX = canvasWidth / 2 + transform.position.x;
			const anchorY = canvasHeight / 2 + transform.position.y;

			scaleStateRef.current = {
				startX: startPos.x,
				startY: startPos.y,
				handle,
				tracksSnapshot: editor.timeline.getTracks(),
				trackId,
				elementId: element.id,
				initialTransform: transform,
				anchorX,
				anchorY,
			};

			// capture pointer on overlay so events continue outside the handle
			scalePointerIdRef.current = event.pointerId;
			overlayRef.current?.setPointerCapture(event.pointerId);

			setIsScaling(true);
		},
		[editor, getCanvasCoordinates, canvasRef, overlayRef],
	);

	const handlePointerMove = useCallback(
		(event: React.PointerEvent) => {
			const currentPos = getCanvasCoordinates({
				clientX: event.clientX,
				clientY: event.clientY,
			});

			// scaling takes priority
			if (scaleStateRef.current && isScaling) {
				const state = scaleStateRef.current;
				const initialDist = Math.hypot(
					state.startX - state.anchorX,
					state.startY - state.anchorY,
				);
				const currentDist = Math.hypot(
					currentPos.x - state.anchorX,
					currentPos.y - state.anchorY,
				);

				if (initialDist < 1) return;

				const ratio = currentDist / initialDist;
				const newScale = Math.max(
					0.1,
					Math.min(5, state.initialTransform.scale * ratio),
				);

				editor.timeline.updateElements({
					updates: [
						{
							trackId: state.trackId,
							elementId: state.elementId,
							updates: {
								transform: {
									...state.initialTransform,
									scale: newScale,
								},
							},
						},
					],
					pushHistory: false,
				});
				return;
			}

			if (!dragStateRef.current || !isDragging) return;

			const deltaX = currentPos.x - dragStateRef.current.startX;
			const deltaY = currentPos.y - dragStateRef.current.startY;

			for (const { trackId, elementId, initialTransform } of dragStateRef
				.current.elements) {
				const newPosition = {
					x: initialTransform.position.x + deltaX,
					y: initialTransform.position.y + deltaY,
				};

				editor.timeline.updateElements({
					updates: [
						{
							trackId,
							elementId,
							updates: {
								transform: {
									...initialTransform,
									position: newPosition,
								},
							},
						},
					],
					pushHistory: false,
				});
			}
		},
		[isDragging, isScaling, getCanvasCoordinates, editor],
	);

	const handlePointerUp = useCallback(
		(event: React.PointerEvent) => {
			// handle scale commit
			if (scaleStateRef.current && isScaling) {
				const state = scaleStateRef.current;
				const currentPos = getCanvasCoordinates({
					clientX: event.clientX,
					clientY: event.clientY,
				});

				const initialDist = Math.hypot(
					state.startX - state.anchorX,
					state.startY - state.anchorY,
				);
				const currentDist = Math.hypot(
					currentPos.x - state.anchorX,
					currentPos.y - state.anchorY,
				);
				const hasScaled = Math.abs(currentDist - initialDist) > 1;

				if (hasScaled) {
					const ratio = currentDist / Math.max(1, initialDist);
					const newScale = Math.max(
						0.1,
						Math.min(5, state.initialTransform.scale * ratio),
					);

					// revert then push with history
					editor.timeline.updateTracks(state.tracksSnapshot);
					editor.timeline.updateElements({
						updates: [
							{
								trackId: state.trackId,
								elementId: state.elementId,
								updates: {
									transform: {
										...state.initialTransform,
										scale: newScale,
									},
								},
							},
						],
					});
				} else {
					editor.timeline.updateTracks(state.tracksSnapshot);
				}

				// release pointer capture
				if (scalePointerIdRef.current !== null) {
					overlayRef.current?.releasePointerCapture(
						scalePointerIdRef.current,
					);
					scalePointerIdRef.current = null;
				}

				scaleStateRef.current = null;
				setIsScaling(false);
				return;
			}

			// handle drag commit
			if (!dragStateRef.current || !isDragging) return;

			const currentPos = getCanvasCoordinates({
				clientX: event.clientX,
				clientY: event.clientY,
			});

			const deltaX = currentPos.x - dragStateRef.current.startX;
			const deltaY = currentPos.y - dragStateRef.current.startY;

			const hasMovement = Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5;

			if (!hasMovement) {
				dragStateRef.current = null;
				setIsDragging(false);
				event.currentTarget.releasePointerCapture(event.pointerId);
				return;
			}

			// revert to pre-drag state so the command captures the correct undo snapshot
			editor.timeline.updateTracks(dragStateRef.current.tracksSnapshot);

			const updates = dragStateRef.current.elements.map(
				({ trackId, elementId, initialTransform }) => {
					const newPosition = {
						x: initialTransform.position.x + deltaX,
						y: initialTransform.position.y + deltaY,
					};

					return {
						trackId,
						elementId,
						updates: {
							transform: {
								...initialTransform,
								position: newPosition,
							},
						},
					};
				},
			);

			editor.timeline.updateElements({ updates });

			dragStateRef.current = null;
			setIsDragging(false);
			event.currentTarget.releasePointerCapture(event.pointerId);
		},
		[isDragging, isScaling, getCanvasCoordinates, editor, overlayRef],
	);

	return {
		onPointerDown: handlePointerDown,
		onPointerMove: handlePointerMove,
		onPointerUp: handlePointerUp,
		onScaleStart: handleScaleStart,
		isTransforming: isDragging || isScaling,
	};
}
