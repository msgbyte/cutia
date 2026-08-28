import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";
import { getVisualSourceTime } from "@/lib/timeline/element-utils";
import type { Transform } from "@/types/timeline";

const VISUAL_EPSILON = 1 / 1000;

export interface VisualNodeParams {
	duration: number;
	timeOffset: number;
	trimStart: number;
	trimEnd: number;
	transform: Transform;
	opacity: number;
	playbackRate?: number;
	reversed?: boolean;
}

export abstract class VisualNode<
	Params extends VisualNodeParams = VisualNodeParams,
> extends BaseNode<Params> {
	protected getLocalTime(time: number): number {
		return getVisualSourceTime({
			timelineTime: time,
			startTime: this.params.timeOffset,
			duration: this.params.duration,
			trimStart: this.params.trimStart,
			playbackRate: this.params.playbackRate,
			reversed: this.params.reversed,
		});
	}

	protected isInRange(time: number): boolean {
		const localTime = this.getLocalTime(time);
		const rate = this.params.playbackRate ?? 1;
		return (
			localTime >= this.params.trimStart - VISUAL_EPSILON &&
			localTime < this.params.trimStart + this.params.duration * rate
		);
	}

	protected renderVisual({
		renderer,
		source,
		sourceWidth,
		sourceHeight,
	}: {
		renderer: CanvasRenderer;
		source: CanvasImageSource;
		sourceWidth: number;
		sourceHeight: number;
	}): void {
		renderer.context.save();

		const { transform, opacity } = this.params;
		const containScale = Math.min(
			renderer.width / sourceWidth,
			renderer.height / sourceHeight,
		);
		const scaledWidth = sourceWidth * containScale * transform.scale;
		const scaledHeight = sourceHeight * containScale * transform.scale;
		const x = renderer.width / 2 + transform.position.x - scaledWidth / 2;
		const y = renderer.height / 2 + transform.position.y - scaledHeight / 2;

		renderer.context.globalAlpha = opacity;

		const centerX = x + scaledWidth / 2;
		const centerY = y + scaledHeight / 2;

		const needsFlip = transform.flipX || transform.flipY;
		const needsRotate = transform.rotate !== 0;

		if (needsRotate || needsFlip) {
			renderer.context.translate(centerX, centerY);
			if (needsRotate) {
				renderer.context.rotate((transform.rotate * Math.PI) / 180);
			}
			if (needsFlip) {
				renderer.context.scale(
					transform.flipX ? -1 : 1,
					transform.flipY ? -1 : 1,
				);
			}
			renderer.context.translate(-centerX, -centerY);
		}

		renderer.context.drawImage(source, x, y, scaledWidth, scaledHeight);
		renderer.context.restore();
	}
}
