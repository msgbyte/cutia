import { drawCssBackground } from "@/lib/gradients";
import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";

export type ColorNodeParams = {
	color: string;
};

export class ColorNode extends BaseNode<ColorNodeParams> {
	private color: string;

	constructor(params: ColorNodeParams) {
		super(params);
		this.color = params.color;
	}

	async render({ renderer }: { renderer: CanvasRenderer }) {
		if (/gradient\(/i.test(this.color)) {
			drawCssBackground({
				ctx: renderer.context,
				width: renderer.width,
				height: renderer.height,
				css: this.color,
			});
			return;
		}

		renderer.context.fillStyle = this.color;
		renderer.context.fillRect(0, 0, renderer.width, renderer.height);
	}
}
