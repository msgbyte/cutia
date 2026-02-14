import type { CanvasRenderer } from "../canvas-renderer";
import { VisualNode, type VisualNodeParams } from "./visual-node";

export interface ImageNodeParams extends VisualNodeParams {
	url: string;
}

export class ImageNode extends VisualNode<ImageNodeParams> {
	private image?: HTMLImageElement;
	private readyPromise: Promise<void>;

	constructor(params: ImageNodeParams) {
		super(params);
		this.readyPromise = this.load();
	}

	private async load() {
		const image = new Image();
		this.image = image;

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("Image load failed"));
			image.src = this.params.url;
		});
	}

	async render({ renderer, time }: { renderer: CanvasRenderer; time: number }) {
		await super.render({ renderer, time });

		if (!this.isInRange(time)) {
			return;
		}

		await this.readyPromise;

		if (!this.image) {
			return;
		}

		const mediaW = this.image.naturalWidth || renderer.width;
		const mediaH = this.image.naturalHeight || renderer.height;

		this.renderVisual({
			renderer,
			source: this.image,
			sourceWidth: mediaW,
			sourceHeight: mediaH,
		});
	}
}
