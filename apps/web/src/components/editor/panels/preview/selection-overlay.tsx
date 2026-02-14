import { useSyncExternalStore, useMemo } from "react";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/utils/ui";
import type {
	TimelineElement,
	VideoElement,
	ImageElement,
	TextElement,
	StickerElement,
} from "@/types/timeline";
import type { MediaAsset } from "@/types/assets";
import { FONT_SIZE_SCALE_REFERENCE } from "@/constants/text-constants";

type ScaleHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const HANDLE_SIZE = 10;
const HANDLES: ScaleHandle[] = [
	"top-left",
	"top-right",
	"bottom-left",
	"bottom-right",
];

interface ElementBounds {
	left: number;
	top: number;
	width: number;
	height: number;
	rotate: number;
}

function getHandlePosition({ handle }: { handle: ScaleHandle }) {
	switch (handle) {
		case "top-left":
			return { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 };
		case "top-right":
			return { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 };
		case "bottom-left":
			return { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 };
		case "bottom-right":
			return { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 };
	}
}

function getHandleCursor({ handle }: { handle: ScaleHandle }) {
	switch (handle) {
		case "top-left":
		case "bottom-right":
			return "nwse-resize";
		case "top-right":
		case "bottom-left":
			return "nesw-resize";
	}
}

function computeMediaBounds({
	element,
	media,
	canvasWidth,
	canvasHeight,
	displayScale,
}: {
	element: VideoElement | ImageElement;
	media: MediaAsset | undefined;
	canvasWidth: number;
	canvasHeight: number;
	displayScale: number;
}): ElementBounds | null {
	if (!media) return null;

	const mediaW = media.width || canvasWidth;
	const mediaH = media.height || canvasHeight;
	const containScale = Math.min(canvasWidth / mediaW, canvasHeight / mediaH);
	const scaledW = mediaW * containScale * element.transform.scale;
	const scaledH = mediaH * containScale * element.transform.scale;

	const canvasX =
		canvasWidth / 2 + element.transform.position.x - scaledW / 2;
	const canvasY =
		canvasHeight / 2 + element.transform.position.y - scaledH / 2;

	return {
		left: canvasX * displayScale,
		top: canvasY * displayScale,
		width: scaledW * displayScale,
		height: scaledH * displayScale,
		rotate: element.transform.rotate,
	};
}

function computeTextBounds({
	element,
	canvasWidth,
	canvasHeight,
	displayScale,
}: {
	element: TextElement;
	canvasWidth: number;
	canvasHeight: number;
	displayScale: number;
}): ElementBounds {
	const scaledFontSize =
		element.fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
	const estimatedWidth = element.content.length * scaledFontSize * 0.6;
	const estimatedHeight = scaledFontSize * 1.4;

	const centerX = canvasWidth / 2 + element.transform.position.x;
	const centerY = canvasHeight / 2 + element.transform.position.y;

	return {
		left: (centerX - estimatedWidth / 2) * displayScale,
		top: (centerY - estimatedHeight / 2) * displayScale,
		width: estimatedWidth * displayScale,
		height: estimatedHeight * displayScale,
		rotate: element.transform.rotate,
	};
}

function computeStickerBounds({
	element,
	canvasWidth,
	canvasHeight,
	displayScale,
}: {
	element: StickerElement;
	canvasWidth: number;
	canvasHeight: number;
	displayScale: number;
}): ElementBounds {
	const stickerSize = 64 * element.transform.scale;

	const centerX = canvasWidth / 2 + element.transform.position.x;
	const centerY = canvasHeight / 2 + element.transform.position.y;

	return {
		left: (centerX - stickerSize / 2) * displayScale,
		top: (centerY - stickerSize / 2) * displayScale,
		width: stickerSize * displayScale,
		height: stickerSize * displayScale,
		rotate: element.transform.rotate,
	};
}

function computeElementBounds({
	element,
	media,
	canvasWidth,
	canvasHeight,
	displayScale,
}: {
	element: TimelineElement;
	media: MediaAsset | undefined;
	canvasWidth: number;
	canvasHeight: number;
	displayScale: number;
}): ElementBounds | null {
	switch (element.type) {
		case "video":
		case "image":
			return computeMediaBounds({
				element,
				media,
				canvasWidth,
				canvasHeight,
				displayScale,
			});
		case "text":
			return computeTextBounds({
				element,
				canvasWidth,
				canvasHeight,
				displayScale,
			});
		case "sticker":
			return computeStickerBounds({
				element,
				canvasWidth,
				canvasHeight,
				displayScale,
			});
		default:
			return null;
	}
}

function ElementOverlay({
	bounds,
	isTransforming,
	onScaleStart,
}: {
	bounds: ElementBounds;
	isTransforming: boolean;
	onScaleStart: ({
		event,
		handle,
	}: { event: React.PointerEvent; handle: ScaleHandle }) => void;
}) {
	return (
		<div
			className="pointer-events-none absolute"
			style={{
				left: bounds.left,
				top: bounds.top,
				width: bounds.width,
				height: bounds.height,
				transform: bounds.rotate !== 0 ? `rotate(${bounds.rotate}deg)` : undefined,
				transformOrigin: "center center",
				zIndex: 1000,
			}}
		>
			{/* Selection border */}
			<div
				className={cn(
					"absolute inset-0 rounded border-2",
					isTransforming ? "border-primary/70" : "border-primary",
				)}
			/>

			{/* Corner handles */}
			{HANDLES.map((handle) => (
				<div
					key={handle}
					className="bg-primary border-background pointer-events-auto absolute rounded-sm border"
					style={{
						width: HANDLE_SIZE,
						height: HANDLE_SIZE,
						cursor: getHandleCursor({ handle }),
						...getHandlePosition({ handle }),
					}}
					onPointerDown={(event) => {
						event.stopPropagation();
						onScaleStart({ event, handle });
					}}
				/>
			))}
		</div>
	);
}

export function SelectionOverlay({
	displaySize,
	onScaleStart,
	isTransforming,
}: {
	displaySize: { width: number; height: number };
	onScaleStart: ({
		event,
		handle,
		element,
		trackId,
	}: {
		event: React.PointerEvent;
		handle: ScaleHandle;
		element: TimelineElement;
		trackId: string;
	}) => void;
	isTransforming: boolean;
}) {
	const editor = useEditor();

	const selectedElements = useSyncExternalStore(
		(listener) => editor.selection.subscribe(listener),
		() => editor.selection.getSelectedElements(),
	);

	const currentTime = editor.playback.getCurrentTime();
	const activeProject = editor.project.getActive();
	const mediaAssets = editor.media.getAssets();
	const canvasWidth = activeProject?.settings.canvasSize.width ?? 0;
	const canvasHeight = activeProject?.settings.canvasSize.height ?? 0;
	const displayScale = canvasWidth > 0 ? displaySize.width / canvasWidth : 1;

	const mediaMap = useMemo(
		() => new Map(mediaAssets.map((asset) => [asset.id, asset])),
		[mediaAssets],
	);

	const elementsWithTracks = editor.timeline.getElementsWithTracks({
		elements: selectedElements,
	});

	// only show overlays for visible elements at the current time
	const visibleElements = elementsWithTracks.filter(({ element }) => {
		if (element.type === "audio") return false;
		return (
			currentTime >= element.startTime &&
			currentTime < element.startTime + element.duration
		);
	});

	if (visibleElements.length === 0 || displaySize.width === 0) {
		return null;
	}

	return (
		<>
			{visibleElements.map(({ track, element }) => {
				const media =
					"mediaId" in element
						? mediaMap.get(element.mediaId)
						: undefined;

				const bounds = computeElementBounds({
					element,
					media,
					canvasWidth,
					canvasHeight,
					displayScale,
				});

				if (!bounds) return null;

				return (
					<ElementOverlay
						key={element.id}
						bounds={bounds}
						isTransforming={isTransforming}
						onScaleStart={({ event, handle }) =>
							onScaleStart({
								event,
								handle,
								element,
								trackId: track.id,
							})
						}
					/>
				);
			})}
		</>
	);
}
