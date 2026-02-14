import type { CanvasRenderer } from "../canvas-renderer";

export type BaseNodeParams = object | undefined;

export class BaseNode<Params extends BaseNodeParams = BaseNodeParams> {
	params: Params;

	constructor(params?: Params) {
		this.params = params ?? ({} as Params);
	}

	children: BaseNode[] = [];

	add(child: BaseNode) {
		this.children.push(child);
		return this;
	}

	remove(child: BaseNode) {
		this.children = this.children.filter((c) => c !== child);
		return this;
	}

	async render({
		renderer,
		time,
	}: {
		renderer: CanvasRenderer;
		time: number;
	}): Promise<void> {
		for (const child of this.children) {
			await child.render({ renderer, time });
		}
	}
}
