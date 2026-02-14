import type { TScene } from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import { calculateTotalDuration } from "@/lib/timeline";
import { ensureMainTrack } from "@/lib/timeline/track-utils";

export function getMainScene({ scenes }: { scenes: TScene[] }): TScene | null {
	return scenes.find((scene) => scene.isMain) || null;
}

export function ensureMainScene({ scenes }: { scenes: TScene[] }): TScene[] {
	const hasMain = scenes.some((scene) => scene.isMain);
	if (!hasMain) {
		const mainScene = buildDefaultScene({ name: "Main scene", isMain: true });
		return [mainScene, ...scenes];
	}
	return scenes;
}

export function buildDefaultScene({
	name,
	isMain,
}: {
	name: string;
	isMain: boolean;
}): TScene {
	const tracks = ensureMainTrack({ tracks: [] });
	return {
		id: generateUUID(),
		name,
		isMain,
		tracks,
		bookmarks: [],
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

export function canDeleteScene({ scene }: { scene: TScene }): {
	canDelete: boolean;
	reason?: string;
} {
	if (scene.isMain) {
		return { canDelete: false, reason: "Cannot delete main scene" };
	}
	return { canDelete: true };
}

export function getFallbackSceneAfterDelete({
	scenes,
	deletedSceneId,
	currentSceneId,
}: {
	scenes: TScene[];
	deletedSceneId: string;
	currentSceneId: string | null;
}): TScene | null {
	if (currentSceneId !== deletedSceneId) {
		return scenes.find((s) => s.id === currentSceneId) || null;
	}
	return getMainScene({ scenes });
}

export function findCurrentScene({
	scenes,
	currentSceneId,
}: {
	scenes: TScene[];
	currentSceneId: string;
}): TScene | null {
	return (
		scenes.find((s) => s.id === currentSceneId) ||
		getMainScene({ scenes }) ||
		scenes[0] ||
		null
	);
}

export function getProjectDurationFromScenes({
	scenes,
}: {
	scenes: TScene[];
}): number {
	const mainScene = getMainScene({ scenes }) ?? scenes[0] ?? null;
	if (!mainScene?.tracks || !Array.isArray(mainScene.tracks)) {
		return 0;
	}

	return calculateTotalDuration({ tracks: mainScene.tracks });
}

export function updateSceneInArray({
	scenes,
	sceneId,
	updates,
}: {
	scenes: TScene[];
	sceneId: string;
	updates: Partial<TScene>;
}): TScene[] {
	return scenes.map((scene) =>
		scene.id === sceneId ? { ...scene, ...updates } : scene,
	);
}
