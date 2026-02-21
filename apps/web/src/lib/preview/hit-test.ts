import type {
	TimelineTrack,
	TimelineElement,
	Transform,
} from "@/types/timeline";
import type { MediaAsset } from "@/types/assets";
import { FONT_SIZE_SCALE_REFERENCE } from "@/constants/text-constants";
import { isMainTrack } from "@/lib/timeline";

export interface HitResult {
	trackId: string;
	element: TimelineElement;
	transform: Transform;
}

function isPointInRotatedRect({
	point,
	center,
	halfWidth,
	halfHeight,
	rotationDeg,
}: {
	point: { x: number; y: number };
	center: { x: number; y: number };
	halfWidth: number;
	halfHeight: number;
	rotationDeg: number;
}): boolean {
	const rad = (-rotationDeg * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const dx = point.x - center.x;
	const dy = point.y - center.y;
	const localX = dx * cos - dy * sin;
	const localY = dx * sin + dy * cos;

	return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
}

function getElementHalfSize({
	element,
	transform,
	mediaMap,
	canvasWidth,
	canvasHeight,
}: {
	element: TimelineElement;
	transform: Transform;
	mediaMap: Map<string, MediaAsset>;
	canvasWidth: number;
	canvasHeight: number;
}): { halfWidth: number; halfHeight: number } | null {
	if (element.type === "video" || element.type === "image") {
		const media = mediaMap.get(element.mediaId);
		const mediaW = media?.width || canvasWidth;
		const mediaH = media?.height || canvasHeight;
		const containScale = Math.min(canvasWidth / mediaW, canvasHeight / mediaH);
		return {
			halfWidth: (mediaW * containScale * transform.scale) / 2,
			halfHeight: (mediaH * containScale * transform.scale) / 2,
		};
	}

	if (element.type === "text") {
		const scaledFontSize =
			element.fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
		return {
			halfWidth: (element.content.length * scaledFontSize * 0.6) / 2,
			halfHeight: (scaledFontSize * 1.4) / 2,
		};
	}

	if (element.type === "sticker") {
		// sticker source is 200x200, rendered via contain-fit
		const stickerSource = 200;
		const containScale = Math.min(
			canvasWidth / stickerSource,
			canvasHeight / stickerSource,
		);
		const half = (stickerSource * containScale * transform.scale) / 2;
		return { halfWidth: half, halfHeight: half };
	}

	return null;
}

/**
 * Returns the topmost visible element at the given canvas-coordinate point,
 * or null when nothing is hit.
 */
export function hitTestElements({
	point,
	tracks,
	mediaAssets,
	canvasWidth,
	canvasHeight,
	currentTime,
}: {
	point: { x: number; y: number };
	tracks: TimelineTrack[];
	mediaAssets: MediaAsset[];
	canvasWidth: number;
	canvasHeight: number;
	currentTime: number;
}): HitResult | null {
	const mediaMap = new Map(mediaAssets.map((asset) => [asset.id, asset]));

	// keep hit-test ordering aligned with renderer layering:
	// top-to-bottom = non-main -> main, then traverse bottom-to-top for draw order
	const orderedTracksTopToBottom = [
		...tracks.filter((track) => !isMainTrack(track)),
		...tracks.filter((track) => isMainTrack(track)),
	];
	const orderedTracksBottomToTop = orderedTracksTopToBottom.slice().reverse();

	const candidates: HitResult[] = [];

	for (const track of orderedTracksBottomToTop) {
		if ("hidden" in track && track.hidden) continue;

		const orderedElements = track.elements
			.slice()
			.sort((a, b) => {
				if (a.startTime !== b.startTime) return a.startTime - b.startTime;
				return a.id.localeCompare(b.id);
			});

		for (const element of orderedElements) {
			if (element.type === "audio") continue;
			if ("hidden" in element && element.hidden) continue;
			const isVisible =
				currentTime >= element.startTime &&
				currentTime < element.startTime + element.duration;
			if (!isVisible) continue;

			const transform = (element as { transform: Transform }).transform;
			candidates.push({ trackId: track.id, element, transform });
		}
	}

	// test from top to bottom (last rendered = topmost)
	for (let i = candidates.length - 1; i >= 0; i--) {
		const candidate = candidates[i];
		const { element, transform } = candidate;

		const center = {
			x: canvasWidth / 2 + transform.position.x,
			y: canvasHeight / 2 + transform.position.y,
		};

		const size = getElementHalfSize({
			element,
			transform,
			mediaMap,
			canvasWidth,
			canvasHeight,
		});

		if (!size) continue;

		if (
			isPointInRotatedRect({
				point,
				center,
				halfWidth: size.halfWidth,
				halfHeight: size.halfHeight,
				rotationDeg: transform.rotate,
			})
		) {
			return candidate;
		}
	}

	return null;
}
