import { describe, expect, test } from "bun:test";
import { EditorCore } from "@/core";
import { buildDefaultScene } from "@/lib/scenes";
import type { MediaAsset } from "@/types/assets";
import type { TProject } from "@/types/project";
import { generateTemplateCut } from "./generate-template-cut";

const createFile = ({
	name,
	type,
}: {
	name: string;
	type: string;
}) => new File(["test"], name, { type });

const createImageAsset = (name: string): MediaAsset => ({
	id: `image-${name}`,
	name,
	type: "image",
	file: createFile({ name, type: "image/png" }),
	width: 1920,
	height: 1080,
});

const createVideoAsset = (name: string, duration: number): MediaAsset => ({
	id: `video-${name}`,
	name,
	type: "video",
	file: createFile({ name, type: "video/mp4" }),
	duration,
	width: 1920,
	height: 1080,
	fps: 30,
});

const createAudioAsset = (name: string, duration: number): MediaAsset => ({
	id: `audio-${name}`,
	name,
	type: "audio",
	file: createFile({ name, type: "audio/mp3" }),
	duration,
});

describe("generateTemplateCut", () => {
	test("creates a visual main track and text track from visual assets", () => {
		const result = generateTemplateCut({
			templateId: "clean-cut",
			assets: [createImageAsset("cover.png"), createVideoAsset("clip.mp4", 8)],
		});

		expect(result.tracks.map((track) => track.type)).toEqual(["video", "text"]);
		expect(result.tracks[0]?.elements).toHaveLength(2);
		expect(result.transitions).toHaveLength(1);
	});

	test("adds a dedicated audio track when audio assets are available", () => {
		const result = generateTemplateCut({
			templateId: "story-pulse",
			assets: [createImageAsset("cover.png"), createAudioAsset("bgm.mp3", 12)],
		});

		expect(result.tracks.map((track) => track.type)).toEqual([
			"video",
			"text",
			"audio",
		]);
		expect(result.tracks[2]?.elements).toHaveLength(1);
	});

	test("uses template-specific pacing and transitions", () => {
		const cleanCut = generateTemplateCut({
			templateId: "clean-cut",
			assets: [createImageAsset("cover.png"), createImageAsset("detail.png")],
		});
		const storyPulse = generateTemplateCut({
			templateId: "story-pulse",
			assets: [createImageAsset("cover.png"), createImageAsset("detail.png")],
		});

		expect(cleanCut.tracks[0]?.elements[0]?.duration).toBe(3.5);
		expect(storyPulse.tracks[0]?.elements[0]?.duration).toBe(2.5);
		expect(cleanCut.transitions[0]?.type).toBe("dissolve");
		expect(storyPulse.transitions[0]?.type).toBe("wipe-left");
	});

	test("throws when no visual assets are provided", () => {
		expect(() =>
			generateTemplateCut({
				templateId: "clean-cut",
				assets: [createAudioAsset("voice.mp3", 5)],
			}),
		).toThrow("No visual assets");
	});

	test("applies generated tracks through the command stack and supports undo", () => {
		const testWindow = {
			setTimeout,
			clearTimeout,
			addEventListener: () => {},
			removeEventListener: () => {},
		} as unknown as Window & typeof globalThis;
		const globalWithWindow = globalThis as typeof globalThis & {
			window?: Window & typeof globalThis;
		};
		const originalWindow = globalWithWindow.window;

		globalWithWindow.window = testWindow;

		try {
			EditorCore.reset();
			const editor = EditorCore.getInstance();
			const mainScene = buildDefaultScene({
				name: "Main scene",
				isMain: true,
			});
			const initialTracks = mainScene.tracks;
			const project: TProject = {
				metadata: {
					id: "project-1",
					name: "Project 1",
					duration: 0,
					createdAt: new Date("2026-03-17T00:00:00.000Z"),
					updatedAt: new Date("2026-03-17T00:00:00.000Z"),
				},
				scenes: [mainScene],
				currentSceneId: mainScene.id,
				settings: {
					fps: 30,
					canvasSize: {
						width: 1920,
						height: 1080,
					},
					originalCanvasSize: null,
					background: {
						type: "color",
						color: "#000000",
					},
				},
				version: 3,
			};

			editor.project.setActiveProject({ project });
			editor.scenes.initializeScenes({
				scenes: project.scenes,
				currentSceneId: project.currentSceneId,
			});

			const { tracks } = generateTemplateCut({
				templateId: "clean-cut",
				assets: [createImageAsset("cover.png")],
			});

			editor.timeline.generateTemplateCut({ tracks });
			expect(editor.timeline.getTracks()).toEqual(tracks);

			editor.command.undo();
			expect(editor.timeline.getTracks()).toEqual(initialTracks);
		} finally {
			EditorCore.reset();
			if (originalWindow) {
				globalWithWindow.window = originalWindow;
			} else {
				delete globalWithWindow.window;
			}
		}
	});
});
