import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";
import type { TextElement } from "@/types/timeline";
import { FONT_SIZE_SCALE_REFERENCE } from "@/constants/text-constants";

function scaleFontSize({
	fontSize,
	canvasHeight,
}: {
	fontSize: number;
	canvasHeight: number;
}): number {
	return fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
}

export type TextNodeParams = TextElement & {
	canvasCenter: { x: number; y: number };
	canvasHeight: number;
	textBaseline?: CanvasTextBaseline;
};

export class TextNode extends BaseNode<TextNodeParams> {
	isInRange({ time }: { time: number }) {
		return (
			time >= this.params.startTime &&
			time < this.params.startTime + this.params.duration
		);
	}

	async render({ renderer, time }: { renderer: CanvasRenderer; time: number }) {
		if (!this.isInRange({ time })) {
			return;
		}

		renderer.context.save();

		const x = this.params.transform.position.x + this.params.canvasCenter.x;
		const y = this.params.transform.position.y + this.params.canvasCenter.y;

		renderer.context.translate(x, y);
		if (this.params.transform.rotate) {
			renderer.context.rotate((this.params.transform.rotate * Math.PI) / 180);
		}

		const fontWeight = this.params.fontWeight === "bold" ? "bold" : "normal";
		const fontStyle = this.params.fontStyle === "italic" ? "italic" : "normal";
		const scaledFontSize = scaleFontSize({
			fontSize: this.params.fontSize,
			canvasHeight: this.params.canvasHeight,
		});
		renderer.context.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${this.params.fontFamily}`;
		renderer.context.textAlign = this.params.textAlign;
		renderer.context.textBaseline = this.params.textBaseline || "middle";
		renderer.context.fillStyle = this.params.color;

		const prevAlpha = renderer.context.globalAlpha;
		renderer.context.globalAlpha = this.params.opacity;

		if (this.params.backgroundColor) {
			const metrics = renderer.context.measureText(this.params.content);
			const ascent = metrics.actualBoundingBoxAscent ?? scaledFontSize * 0.8;
			const descent = metrics.actualBoundingBoxDescent ?? scaledFontSize * 0.2;
			const textW = metrics.width;
			const textH = ascent + descent;
			const padX = 8;
			const padY = 4;

			renderer.context.fillStyle = this.params.backgroundColor;
			let bgLeft = -textW / 2;
			if (renderer.context.textAlign === "left") bgLeft = 0;
			if (renderer.context.textAlign === "right") bgLeft = -textW;

			renderer.context.fillRect(
				bgLeft - padX,
				-textH / 2 - padY,
				textW + padX * 2,
				textH + padY * 2,
			);

			renderer.context.fillStyle = this.params.color;
		}

		renderer.context.fillText(this.params.content, 0, 0);

		renderer.context.globalAlpha = prevAlpha;
		renderer.context.restore();
	}
}
