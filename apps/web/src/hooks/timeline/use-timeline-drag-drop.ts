import { useState, useCallback, type RefObject } from "react";
import { useEditor } from "@/hooks/use-editor";
import { processMediaAssets } from "@/lib/media/processing";
import { toast } from "sonner";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { snapTimeToFrame } from "@/lib/time";
import {
	buildTextElement,
	buildStickerElement,
	buildUploadAudioElement,
	buildVideoElement,
	buildImageElement,
} from "@/lib/timeline/element-utils";
import { computeDropTarget } from "@/lib/timeline/drop-utils";
import { getDragData, hasDragData } from "@/lib/drag-data";
import type { TrackType, DropTarget, ElementType } from "@/types/timeline";
import type { MediaDragData, StickerDragData } from "@/types/drag";

interface UseTimelineDragDropProps {
	containerRef: RefObject<HTMLDivElement | null>;
	headerRef?: RefObject<HTMLElement | null>;
	zoomLevel: number;
}

export function useTimelineDragDrop({
	containerRef,
	headerRef,
	zoomLevel,
}: UseTimelineDragDropProps) {
	const editor = useEditor();
	const [isDragOver, setIsDragOver] = useState(false);
	const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
	const [dragElementType, setElementType] = useState<ElementType | null>(null);

	const tracks = editor.timeline.getTracks();
	const currentTime = editor.playback.getCurrentTime();
	const mediaAssets = editor.media.getAssets();
	const activeProject = editor.project.getActive();

	const getSnappedTime = useCallback(
		({ time }: { time: number }) => {
			const projectFps = activeProject.settings.fps;
			return snapTimeToFrame({ time, fps: projectFps });
		},
		[activeProject.settings.fps],
	);

	const getElementType = useCallback(
		({ dataTransfer }: { dataTransfer: DataTransfer }): ElementType | null => {
			const dragData = getDragData({ dataTransfer });
			if (!dragData) return null;

			if (dragData.type === "text") return "text";
			if (dragData.type === "sticker") return "sticker";
			if (dragData.type === "media") {
				return dragData.mediaType;
			}
			return null;
		},
		[],
	);

	const getElementDuration = useCallback(
		({
			elementType,
			mediaId,
		}: {
			elementType: ElementType;
			mediaId?: string;
		}): number => {
			if (elementType === "text" || elementType === "sticker") {
				return TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
			}
			if (mediaId) {
				const media = mediaAssets.find((m) => m.id === mediaId);
				return media?.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
			}
			return TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
		},
		[mediaAssets],
	);

	const handleDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		const hasAsset = hasDragData({ dataTransfer: e.dataTransfer });
		const hasFiles = e.dataTransfer.types.includes("Files");
		if (!hasAsset && !hasFiles) return;
		setIsDragOver(true);
	}, []);

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();

			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const headerHeight =
				headerRef?.current?.getBoundingClientRect().height ?? 0;
			const hasFiles = e.dataTransfer.types.includes("Files");
			const isExternal =
				hasFiles && !hasDragData({ dataTransfer: e.dataTransfer });

			const elementType = getElementType({ dataTransfer: e.dataTransfer });

			if (!elementType && hasFiles && isExternal) {
				setDropTarget(null);
				setElementType(null);
				return;
			}

			if (!elementType) return;

			setElementType(elementType);

			const dragData = getDragData({ dataTransfer: e.dataTransfer });
			const duration = getElementDuration({
				elementType,
				mediaId: dragData?.type === "media" ? dragData.id : undefined,
			});

			const mouseX = e.clientX - rect.left;
			const mouseY = Math.max(0, e.clientY - rect.top - headerHeight);

			const target = computeDropTarget({
				elementType,
				mouseX,
				mouseY,
				tracks,
				playheadTime: currentTime,
				isExternalDrop: isExternal,
				elementDuration: duration,
				pixelsPerSecond: TIMELINE_CONSTANTS.PIXELS_PER_SECOND,
				zoomLevel,
			});

			target.xPosition = getSnappedTime({ time: target.xPosition });

			setDropTarget(target);
			e.dataTransfer.dropEffect = "copy";
		},
		[
			containerRef,
			headerRef,
			tracks,
			currentTime,
			zoomLevel,
			getElementType,
			getElementDuration,
			getSnappedTime,
		],
	);

	const handleDragLeave = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const rect = containerRef.current?.getBoundingClientRect();
			if (rect) {
				const { clientX, clientY } = e;
				if (
					clientX < rect.left ||
					clientX > rect.right ||
					clientY < rect.top ||
					clientY > rect.bottom
				) {
					setIsDragOver(false);
					setDropTarget(null);
					setElementType(null);
				}
			}
		},
		[containerRef],
	);

	const executeTextDrop = useCallback(
		({
			target,
			dragData,
		}: {
			target: DropTarget;
			dragData: { name?: string; content?: string };
		}) => {
			let trackId: string;

			if (target.isNewTrack) {
				trackId = editor.timeline.addTrack({
					type: "text",
					index: target.trackIndex,
				});
			} else {
				const track = tracks[target.trackIndex];
				if (!track) return;
				trackId = track.id;
			}

			const element = buildTextElement({
				raw: {
					name: dragData.name ?? "",
					content: dragData.content ?? "",
				},
				startTime: target.xPosition,
			});

			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId },
				element,
			});
		},
		[editor.timeline, tracks],
	);

	const executeStickerDrop = useCallback(
		({
			target,
			dragData,
		}: {
			target: DropTarget;
			dragData: StickerDragData;
		}) => {
			let trackId: string;

			if (target.isNewTrack) {
				trackId = editor.timeline.addTrack({
					type: "sticker",
					index: target.trackIndex,
				});
			} else {
				const track = tracks[target.trackIndex];
				if (!track) return;
				trackId = track.id;
			}

			const element = buildStickerElement({
				iconName: dragData.iconName,
				startTime: target.xPosition,
			});

			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId },
				element,
			});
		},
		[editor.timeline, tracks],
	);

	const executeMediaDrop = useCallback(
		({ target, dragData }: { target: DropTarget; dragData: MediaDragData }) => {
			const mediaAsset = mediaAssets.find((m) => m.id === dragData.id);
			if (!mediaAsset) return;

			const trackType: TrackType =
				dragData.mediaType === "audio" ? "audio" : "video";
			let trackId: string;

			if (target.isNewTrack) {
				trackId = editor.timeline.addTrack({
					type: trackType,
					index: target.trackIndex,
				});
			} else {
				const track = tracks[target.trackIndex];
				if (!track) return;
				trackId = track.id;
			}

			const duration =
				mediaAsset.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;

			if (dragData.mediaType === "audio") {
				editor.timeline.insertElement({
					placement: { mode: "explicit", trackId },
					element: buildUploadAudioElement({
						mediaId: mediaAsset.id,
						name: mediaAsset.name,
						duration,
						startTime: target.xPosition,
					}),
				});
			} else if (dragData.mediaType === "video") {
				editor.timeline.insertElement({
					placement: { mode: "explicit", trackId },
					element: buildVideoElement({
						mediaId: mediaAsset.id,
						name: mediaAsset.name,
						duration,
						startTime: target.xPosition,
					}),
				});
			} else {
				editor.timeline.insertElement({
					placement: { mode: "explicit", trackId },
					element: buildImageElement({
						mediaId: mediaAsset.id,
						name: mediaAsset.name,
						duration,
						startTime: target.xPosition,
					}),
				});
			}
		},
		[editor.timeline, mediaAssets, tracks],
	);

	const executeFileDrop = useCallback(
		async ({
			files,
			mouseX,
			mouseY,
		}: {
			files: File[];
			mouseX: number;
			mouseY: number;
		}) => {
			if (!activeProject) return;

			const processedAssets = await processMediaAssets({ files });

			for (const asset of processedAssets) {
				await editor.media.addMediaAsset({
					projectId: activeProject.metadata.id,
					asset,
				});

				const added = editor.media
					.getAssets()
					.find((m) => m.name === asset.name && m.url === asset.url);

				if (added) {
					const duration =
						added.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
					const currentTracks = editor.timeline.getTracks();
					const dropTarget = computeDropTarget({
						elementType: added.type,
						mouseX,
						mouseY,
						tracks: currentTracks,
						playheadTime: currentTime,
						isExternalDrop: true,
						elementDuration: duration,
						pixelsPerSecond: TIMELINE_CONSTANTS.PIXELS_PER_SECOND,
						zoomLevel,
					});

					const trackType: TrackType =
						added.type === "audio" ? "audio" : "video";
					const trackId = dropTarget.isNewTrack
						? editor.timeline.addTrack({
								type: trackType,
								index: dropTarget.trackIndex,
							})
						: currentTracks[dropTarget.trackIndex]?.id;

					if (!trackId) return;

					if (added.type === "audio") {
						editor.timeline.insertElement({
							placement: { mode: "explicit", trackId },
							element: buildUploadAudioElement({
								mediaId: added.id,
								name: added.name,
								duration,
								startTime: dropTarget.xPosition,
								buffer: new AudioBuffer({ length: 1, sampleRate: 44100 }),
							}),
						});
					} else if (added.type === "video") {
						editor.timeline.insertElement({
							placement: { mode: "explicit", trackId },
							element: buildVideoElement({
								mediaId: added.id,
								name: added.name,
								duration,
								startTime: dropTarget.xPosition,
							}),
						});
					} else {
						editor.timeline.insertElement({
							placement: { mode: "explicit", trackId },
							element: buildImageElement({
								mediaId: added.id,
								name: added.name,
								duration,
								startTime: dropTarget.xPosition,
							}),
						});
					}
				}
			}
		},
		[activeProject, editor.media, editor.timeline, currentTime, zoomLevel],
	);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();

			const hasAsset = hasDragData({ dataTransfer: e.dataTransfer });
			const hasFiles = e.dataTransfer.files?.length > 0;

			if (!hasAsset && !hasFiles) return;

			const currentTarget = dropTarget;
			setIsDragOver(false);
			setDropTarget(null);
			setElementType(null);

			try {
				if (hasAsset) {
					if (!currentTarget) return;
					const dragData = getDragData({ dataTransfer: e.dataTransfer });
					if (!dragData) return;

					if (dragData.type === "text") {
						executeTextDrop({ target: currentTarget, dragData });
					} else if (dragData.type === "sticker") {
						executeStickerDrop({ target: currentTarget, dragData });
					} else {
						executeMediaDrop({ target: currentTarget, dragData });
					}
				} else if (hasFiles) {
					const rect = containerRef.current?.getBoundingClientRect();
					if (!rect) return;
					const mouseX = e.clientX - rect.left;
					const headerHeight =
						headerRef?.current?.getBoundingClientRect().height ?? 0;
					const mouseY = Math.max(0, e.clientY - rect.top - headerHeight);
					await executeFileDrop({
						files: Array.from(e.dataTransfer.files),
						mouseX,
						mouseY,
					});
				}
			} catch (err) {
				console.error("Failed to process drop:", err);
				toast.error("Failed to process drop");
			}
		},
		[
			dropTarget,
			executeTextDrop,
			executeStickerDrop,
			executeMediaDrop,
			executeFileDrop,
			containerRef,
			headerRef,
		],
	);

	return {
		isDragOver,
		dropTarget,
		dragElementType,
		dragProps: {
			onDragEnter: handleDragEnter,
			onDragOver: handleDragOver,
			onDragLeave: handleDragLeave,
			onDrop: handleDrop,
		},
	};
}
