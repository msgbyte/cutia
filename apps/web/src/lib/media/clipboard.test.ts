import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { EditorCore } from "@/core";
import { storageService } from "@/services/storage/service";
import * as processing from "./processing";
import { importClipboardImages } from "./clipboard";

const previousWindow = globalThis.window;
let editor: EditorCore;
let process: ReturnType<typeof spyOn<typeof processing, "processMediaAssets">>;
let save: ReturnType<typeof spyOn<typeof storageService, "saveMediaAsset">>;
let remove: ReturnType<typeof spyOn<typeof storageService, "deleteMediaAsset">>;
const image = new File(["image"], "screenshot.png", { type: "image/png" });

beforeEach(() => {
	Object.assign(globalThis, { window: globalThis });
	EditorCore.reset();
	editor = EditorCore.getInstance();
	editor.save.stop();
	const scene = {
		id: "scene",
		name: "Scene",
		isMain: true,
		tracks: [],
		bookmarks: [],
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	editor.project.setActiveProject({
		project: {
			metadata: {
				id: "project",
				name: "Project",
				duration: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			scenes: [scene],
			currentSceneId: scene.id,
			settings: {
				fps: 30,
				canvasSize: { width: 1920, height: 1080 },
				background: { type: "color", color: "#000000" },
			},
			version: 3,
		},
	});
	editor.scenes.setScenes({ scenes: [scene], activeSceneId: scene.id });
	// Image decoding and IndexedDB require browser APIs; keep editor commands real.
	process = spyOn(processing, "processMediaAssets").mockImplementation(
		async ({ files }) =>
			Array.from(files).map((file) => ({
				name: file.name,
				type: "image",
				file,
				url: URL.createObjectURL(file),
				width: 320,
				height: 180,
			})),
	);
	save = spyOn(storageService, "saveMediaAsset").mockResolvedValue();
	remove = spyOn(storageService, "deleteMediaAsset").mockResolvedValue();
});

afterEach(async () => {
	await Promise.resolve();
	for (const asset of editor.media.getAssets()) {
		if (asset.url) URL.revokeObjectURL(asset.url);
	}
	process.mockRestore();
	save.mockRestore();
	remove.mockRestore();
	EditorCore.reset();
	Object.assign(globalThis, { window: previousWindow });
});

test("pastes images onto a video track at the requested time, with undo and redo", async () => {
	await importClipboardImages({ editor, files: [image], startTime: 4 });
	const tracks = editor.timeline.getTracks();
	expect(tracks).toHaveLength(1);
	expect(tracks[0]).toMatchObject({
		type: "video",
		elements: [
			{ type: "image", name: "screenshot.png", startTime: 4, duration: 5 },
		],
	});
	expect(editor.media.getAssets()[0].file).toBe(image);
	editor.command.undo();
	expect(editor.timeline.getTracks()).toEqual([]);
	expect(editor.media.getAssets()).toEqual([]);
	editor.command.redo();
	expect(editor.timeline.getTracks()[0].elements).toEqual(tracks[0].elements);
	expect(editor.media.getAssets()).toHaveLength(1);
});

test("creates another video track when the paste would overlap", async () => {
	await importClipboardImages({ editor, files: [image], startTime: 4 });
	await importClipboardImages({ editor, files: [image], startTime: 4 });
	expect(editor.timeline.getTracks()).toHaveLength(2);
	for (const track of editor.timeline.getTracks()) {
		expect(track.type).toBe("video");
		expect(track.elements).toHaveLength(1);
		expect(track.elements[0].startTime).toBe(4);
	}
});

test("ignores non-image files without creating history", async () => {
	await importClipboardImages({
		editor,
		files: [new File(["text"], "notes.txt", { type: "text/plain" })],
		startTime: 0,
	});
	expect(editor.timeline.getTracks()).toEqual([]);
	expect(editor.media.getAssets()).toEqual([]);
	expect(editor.command.canUndo()).toBe(false);
});

test("does not insert an image when saving it fails", async () => {
	save.mockRejectedValue(new Error("Storage full"));
	await expect(
		importClipboardImages({ editor, files: [image], startTime: 4 }),
	).rejects.toThrow("Storage full");
	expect(editor.timeline.getTracks()).toEqual([]);
	expect(editor.media.getAssets()).toEqual([]);
	expect(editor.command.canUndo()).toBe(false);
});

test("does not paste into another scene after asynchronous processing", async () => {
	save.mockImplementation(async () => {
		const scene = { ...editor.scenes.getActiveScene(), id: "other-scene" };
		editor.scenes.setScenes({ scenes: [scene], activeSceneId: scene.id });
	});
	await expect(
		importClipboardImages({ editor, files: [image], startTime: 4 }),
	).rejects.toThrow();
	expect(editor.timeline.getTracks()).toEqual([]);
	expect(editor.media.getAssets()).toEqual([]);
	expect(editor.command.canUndo()).toBe(false);
});
