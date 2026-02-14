import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";
import type { TransitionType } from "@/types/timeline";

export interface TransitionNodeParams {
	type: TransitionType;
	duration: number;
	transitionStart: number;
	outgoingNode: BaseNode;
	incomingNode: BaseNode;
	outgoingEndTime: number;
	incomingStartTime: number;
}

export class TransitionNode extends BaseNode<TransitionNodeParams> {
	private outgoing: BaseNode;
	private incoming: BaseNode;
	private offscreenA?: OffscreenCanvas | HTMLCanvasElement;
	private offscreenB?: OffscreenCanvas | HTMLCanvasElement;

	constructor(params: TransitionNodeParams) {
		super(params);
		this.outgoing = params.outgoingNode;
		this.incoming = params.incomingNode;
	}

	private getProgress({ time }: { time: number }): number | null {
		const { transitionStart, duration } = this.params;
		if (time < transitionStart || time >= transitionStart + duration) {
			return null;
		}
		return (time - transitionStart) / duration;
	}

	private ensureOffscreen({
		width,
		height,
	}: {
		width: number;
		height: number;
	}): {
		canvasA: OffscreenCanvas | HTMLCanvasElement;
		canvasB: OffscreenCanvas | HTMLCanvasElement;
	} {
		const needsRecreate =
			!this.offscreenA ||
			!this.offscreenB ||
			(this.offscreenA instanceof OffscreenCanvas
				? this.offscreenA.width !== width || this.offscreenA.height !== height
				: this.offscreenA.width !== width ||
					this.offscreenA.height !== height);

		if (needsRecreate) {
			try {
				this.offscreenA = new OffscreenCanvas(width, height);
				this.offscreenB = new OffscreenCanvas(width, height);
			} catch {
				this.offscreenA = document.createElement("canvas");
				this.offscreenA.width = width;
				this.offscreenA.height = height;
				this.offscreenB = document.createElement("canvas");
				this.offscreenB.width = width;
				this.offscreenB.height = height;
			}
		}

		const canvasA = this.offscreenA;
		const canvasB = this.offscreenB;
		if (!canvasA || !canvasB) {
			throw new Error("Failed to create offscreen canvases");
		}

		return { canvasA, canvasB };
	}

	async render({
		renderer,
		time,
	}: {
		renderer: CanvasRenderer;
		time: number;
	}): Promise<void> {
		const progress = this.getProgress({ time });

		if (progress === null) {
			await this.outgoing.render({ renderer, time });
			await this.incoming.render({ renderer, time });
			return;
		}

		const { width, height } = renderer;
		const { canvasA, canvasB } = this.ensureOffscreen({ width, height });

		const ctxA = canvasA.getContext("2d");
		const ctxB = canvasB.getContext("2d");
		if (!ctxA || !ctxB) {
			throw new Error("Failed to get offscreen canvas context");
		}

		ctxA.clearRect(0, 0, width, height);
		ctxB.clearRect(0, 0, width, height);

		const originalContext = renderer.context;

		// clamp so each element stays in its valid range during the transition
		const outgoingTime = Math.min(time, this.params.outgoingEndTime - 1 / 1000);
		const incomingTime = Math.max(time, this.params.incomingStartTime);

		renderer.context = ctxA as typeof originalContext;
		await this.outgoing.render({ renderer, time: outgoingTime });

		renderer.context = ctxB as typeof originalContext;
		await this.incoming.render({ renderer, time: incomingTime });

		renderer.context = originalContext;

		applyTransition({
			context: renderer.context,
			canvasA,
			canvasB,
			width,
			height,
			progress,
			type: this.params.type,
		});
	}
}

function applyTransition({
	context,
	canvasA,
	canvasB,
	width,
	height,
	progress,
	type,
}: {
	context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	canvasA: OffscreenCanvas | HTMLCanvasElement;
	canvasB: OffscreenCanvas | HTMLCanvasElement;
	width: number;
	height: number;
	progress: number;
	type: TransitionType;
}): void {
	const source = { canvasA, canvasB } as const;

	switch (type) {
		case "fade":
			applyFade({ context, ...source, width, height, progress });
			break;
		case "dissolve":
			applyDissolve({ context, ...source, width, height, progress });
			break;
		case "wipe-left":
			applyWipe({ context, ...source, width, height, progress, direction: "left" });
			break;
		case "wipe-right":
			applyWipe({ context, ...source, width, height, progress, direction: "right" });
			break;
		case "wipe-up":
			applyWipe({ context, ...source, width, height, progress, direction: "up" });
			break;
		case "wipe-down":
			applyWipe({ context, ...source, width, height, progress, direction: "down" });
			break;
		case "slide-left":
			applySlide({ context, ...source, width, height, progress, direction: "left" });
			break;
		case "slide-right":
			applySlide({ context, ...source, width, height, progress, direction: "right" });
			break;
		case "slide-up":
			applySlide({ context, ...source, width, height, progress, direction: "up" });
			break;
		case "slide-down":
			applySlide({ context, ...source, width, height, progress, direction: "down" });
			break;
		case "zoom-in":
			applyZoom({ context, ...source, width, height, progress, direction: "in" });
			break;
		case "zoom-out":
			applyZoom({ context, ...source, width, height, progress, direction: "out" });
			break;
		default:
			applyFade({ context, ...source, width, height, progress });
	}
}

type TransitionContext = {
	context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	canvasA: OffscreenCanvas | HTMLCanvasElement;
	canvasB: OffscreenCanvas | HTMLCanvasElement;
	width: number;
	height: number;
	progress: number;
};

function applyFade({ context, canvasA, canvasB, width, height, progress }: TransitionContext): void {
	context.save();
	context.globalAlpha = 1 - progress;
	context.drawImage(canvasA as CanvasImageSource, 0, 0, width, height);
	context.globalAlpha = progress;
	context.drawImage(canvasB as CanvasImageSource, 0, 0, width, height);
	context.restore();
}

function applyDissolve({ context, canvasA, canvasB, width, height, progress }: TransitionContext): void {
	// smooth dissolve with eased alpha
	const eased = progress * progress * (3 - 2 * progress);
	context.save();
	context.globalAlpha = 1;
	context.drawImage(canvasA as CanvasImageSource, 0, 0, width, height);
	context.globalAlpha = eased;
	context.drawImage(canvasB as CanvasImageSource, 0, 0, width, height);
	context.restore();
}

function applyWipe({
	context,
	canvasA,
	canvasB,
	width,
	height,
	progress,
	direction,
}: TransitionContext & { direction: "left" | "right" | "up" | "down" }): void {
	context.save();
	context.drawImage(canvasA as CanvasImageSource, 0, 0, width, height);

	context.save();
	context.beginPath();

	switch (direction) {
		case "left":
			context.rect(width * (1 - progress), 0, width * progress, height);
			break;
		case "right":
			context.rect(0, 0, width * progress, height);
			break;
		case "up":
			context.rect(0, height * (1 - progress), width, height * progress);
			break;
		case "down":
			context.rect(0, 0, width, height * progress);
			break;
	}

	context.clip();
	context.drawImage(canvasB as CanvasImageSource, 0, 0, width, height);
	context.restore();
	context.restore();
}

function applySlide({
	context,
	canvasA,
	canvasB,
	width,
	height,
	progress,
	direction,
}: TransitionContext & { direction: "left" | "right" | "up" | "down" }): void {
	context.save();

	let offsetX = 0;
	let offsetY = 0;

	switch (direction) {
		case "left":
			offsetX = -width * progress;
			break;
		case "right":
			offsetX = width * progress;
			break;
		case "up":
			offsetY = -height * progress;
			break;
		case "down":
			offsetY = height * progress;
			break;
	}

	context.drawImage(canvasA as CanvasImageSource, offsetX, offsetY, width, height);

	switch (direction) {
		case "left":
			context.drawImage(canvasB as CanvasImageSource, width + offsetX, offsetY, width, height);
			break;
		case "right":
			context.drawImage(canvasB as CanvasImageSource, -width + offsetX, offsetY, width, height);
			break;
		case "up":
			context.drawImage(canvasB as CanvasImageSource, offsetX, height + offsetY, width, height);
			break;
		case "down":
			context.drawImage(canvasB as CanvasImageSource, offsetX, -height + offsetY, width, height);
			break;
	}

	context.restore();
}

function applyZoom({
	context,
	canvasA,
	canvasB,
	width,
	height,
	progress,
	direction,
}: TransitionContext & { direction: "in" | "out" }): void {
	context.save();

	if (direction === "in") {
		const scale = 1 + progress * 0.5;
		const scaledWidth = width * scale;
		const scaledHeight = height * scale;
		const offsetX = (width - scaledWidth) / 2;
		const offsetY = (height - scaledHeight) / 2;

		context.globalAlpha = 1 - progress;
		context.drawImage(canvasA as CanvasImageSource, offsetX, offsetY, scaledWidth, scaledHeight);
		context.globalAlpha = progress;
		context.drawImage(canvasB as CanvasImageSource, 0, 0, width, height);
	} else {
		const scale = 1 - progress * 0.5;
		const scaledWidth = width * scale;
		const scaledHeight = height * scale;
		const offsetX = (width - scaledWidth) / 2;
		const offsetY = (height - scaledHeight) / 2;

		context.globalAlpha = 1 - progress;
		context.drawImage(canvasA as CanvasImageSource, 0, 0, width, height);
		context.globalAlpha = progress;
		context.drawImage(canvasB as CanvasImageSource, offsetX, offsetY, scaledWidth, scaledHeight);
	}

	context.restore();
}
