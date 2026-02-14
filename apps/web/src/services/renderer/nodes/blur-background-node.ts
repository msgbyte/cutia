import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";

export type BlurBackgroundNodeParams = {
	blurIntensity: number;
	contentNodes: BaseNode[];
};

export class BlurBackgroundNode extends BaseNode<BlurBackgroundNodeParams> {
	private blurIntensity: number;
	private contentNodes: BaseNode[];

	constructor(params: BlurBackgroundNodeParams) {
		super(params);
		this.blurIntensity = params.blurIntensity;
		this.contentNodes = params.contentNodes;
	}

	async render({
		renderer,
		time,
	}: {
		renderer: CanvasRenderer;
		time: number;
	}): Promise<void> {
		let offscreen: OffscreenCanvas | HTMLCanvasElement;
		let offscreenCtx:
			| OffscreenCanvasRenderingContext2D
			| CanvasRenderingContext2D;

		try {
			offscreen = new OffscreenCanvas(renderer.width, renderer.height);
			const ctx = offscreen.getContext("2d");
			if (!ctx) {
				throw new Error("failed to get offscreen canvas context");
			}
			offscreenCtx = ctx;
		} catch {
			offscreen = document.createElement("canvas");
			offscreen.width = renderer.width;
			offscreen.height = renderer.height;
			const ctx = offscreen.getContext("2d");
			if (!ctx) {
				throw new Error("failed to get canvas context");
			}
			offscreenCtx = ctx;
		}

		const originalContext = renderer.context;
		renderer.context = offscreenCtx;

		for (const node of this.contentNodes) {
			await node.render({ renderer, time });
		}

		renderer.context = originalContext;

		const zoomScale = 1.4;
		const scaledWidth = renderer.width * zoomScale;
		const scaledHeight = renderer.height * zoomScale;
		const offsetX = (renderer.width - scaledWidth) / 2;
		const offsetY = (renderer.height - scaledHeight) / 2;

		renderer.context.save();
		renderer.context.filter = `blur(${this.blurIntensity}px)`;
		renderer.context.drawImage(
			offscreen as CanvasImageSource,
			offsetX,
			offsetY,
			scaledWidth,
			scaledHeight,
		);
		renderer.context.restore();
	}
}
