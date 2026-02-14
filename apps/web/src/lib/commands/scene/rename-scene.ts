import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TScene } from "@/types/timeline";
import { updateSceneInArray } from "@/lib/scenes";

export class RenameSceneCommand extends Command {
	private savedScenes: TScene[] | null = null;
	private previousName: string | null = null;

	constructor(
		private sceneId: string,
		private newName: string,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		const scenes = editor.scenes.getScenes();

		this.savedScenes = [...scenes];

		const scene = scenes.find((s) => s.id === this.sceneId);
		if (!scene) {
			console.error("Scene not found:", this.sceneId);
			return;
		}

		this.previousName = scene.name;

		const updatedScenes = updateSceneInArray({
			scenes,
			sceneId: this.sceneId,
			updates: { name: this.newName, updatedAt: new Date() },
		});

		editor.scenes.setScenes({ scenes: updatedScenes });
	}

	undo(): void {
		if (this.savedScenes && this.previousName !== null) {
			const editor = EditorCore.getInstance();
			editor.scenes.setScenes({ scenes: this.savedScenes });
		}
	}
}
