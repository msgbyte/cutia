import { describe, expect, test } from "bun:test";
import { getProjectId, transformProjectV2ToV3 } from "../transformers/v2-to-v3";
import {
	projectWithNoId,
	v2Project,
	v2ProjectEmptyScenes,
	v2ProjectSceneWithoutTracks,
	v2ProjectWithBlurBackground,
	v3Project,
} from "./fixtures";

describe("V2 to V3 Migration", () => {
	describe("transformProjectV2ToV3", () => {
		test("adds duration to metadata", () => {
			const result = transformProjectV2ToV3({ project: v2Project });

			expect(result.skipped).toBe(false);
			expect(result.project.version).toBe(3);

			const metadata = result.project.metadata as Record<string, unknown>;
			expect(typeof metadata.duration).toBe("number");
		});

		test("calculates duration from scene tracks", () => {
			const result = transformProjectV2ToV3({ project: v2Project });

			const metadata = result.project.metadata as Record<string, unknown>;
			// v2Project has a video element with duration 15.5 and a text element at startTime 2 with duration 5
			// Total duration should be max(15.5, 2+5) = 15.5
			expect(metadata.duration).toBe(15.5);
		});

		test("handles project with blur background", () => {
			const result = transformProjectV2ToV3({
				project: v2ProjectWithBlurBackground,
			});

			expect(result.skipped).toBe(false);
			const metadata = result.project.metadata as Record<string, unknown>;
			// v2ProjectWithBlurBackground has a video with duration 30
			expect(metadata.duration).toBe(30);
		});

		test("handles empty scenes with zero duration", () => {
			const result = transformProjectV2ToV3({ project: v2ProjectEmptyScenes });

			expect(result.skipped).toBe(false);
			const metadata = result.project.metadata as Record<string, unknown>;
			expect(metadata.duration).toBe(0);
		});

		test("handles scene without tracks property", () => {
			const result = transformProjectV2ToV3({
				project: v2ProjectSceneWithoutTracks,
			});

			expect(result.skipped).toBe(false);
			const metadata = result.project.metadata as Record<string, unknown>;
			expect(metadata.duration).toBe(0);
		});

		test("skips project that already has v3 structure", () => {
			const result = transformProjectV2ToV3({ project: v3Project });

			expect(result.skipped).toBe(true);
			expect(result.reason).toBe("already v3");
		});

		test("skips project that has duration in metadata", () => {
			const projectWithDuration = {
				...v2Project,
				version: 2,
				metadata: {
					...v2Project.metadata,
					duration: 10,
				},
			};
			const result = transformProjectV2ToV3({ project: projectWithDuration });

			expect(result.skipped).toBe(true);
			expect(result.reason).toBe("already v3");
		});

		test("skips project with no id", () => {
			const result = transformProjectV2ToV3({ project: projectWithNoId });

			expect(result.skipped).toBe(true);
			expect(result.reason).toBe("no project id");
		});

		test("preserves existing metadata fields", () => {
			const result = transformProjectV2ToV3({ project: v2Project });

			const metadata = result.project.metadata as Record<string, unknown>;
			expect(metadata.id).toBe(v2Project.metadata.id);
			expect(metadata.name).toBe(v2Project.metadata.name);
			expect(metadata.thumbnail).toBe(v2Project.metadata.thumbnail);
			expect(metadata.createdAt).toBe(v2Project.metadata.createdAt);
			expect(metadata.updatedAt).toBe(v2Project.metadata.updatedAt);
		});

		test("preserves settings object", () => {
			const result = transformProjectV2ToV3({ project: v2Project });

			expect(result.project.settings).toEqual(v2Project.settings);
		});

		test("preserves scenes array", () => {
			const result = transformProjectV2ToV3({ project: v2Project });

			expect(result.project.scenes).toEqual(v2Project.scenes);
		});

		test("handles project without metadata object", () => {
			const projectWithoutMetadata = {
				id: "no-metadata",
				version: 2,
				scenes: [],
			};
			const result = transformProjectV2ToV3({
				project: projectWithoutMetadata,
			});

			expect(result.skipped).toBe(false);
			const metadata = result.project.metadata as Record<string, unknown>;
			expect(metadata.duration).toBe(0);
		});

		test("calculates duration from main scene only", () => {
			const multiSceneProject = {
				id: "multi-scene",
				version: 2,
				metadata: { id: "multi-scene", name: "Multi" },
				scenes: [
					{
						id: "scene-1",
						isMain: true,
						tracks: [
							{
								type: "video",
								elements: [{ startTime: 0, duration: 10 }],
							},
						],
					},
					{
						id: "scene-2",
						isMain: false,
						tracks: [
							{
								type: "video",
								elements: [{ startTime: 0, duration: 20 }],
							},
						],
					},
				],
			};
			const result = transformProjectV2ToV3({ project: multiSceneProject });

			const metadata = result.project.metadata as Record<string, unknown>;
			// Duration is from main scene only, not sum of all scenes
			expect(metadata.duration).toBe(10);
		});
	});

	describe("getProjectId", () => {
		test("returns id from root level", () => {
			const projectWithRootId = { id: "root-id", metadata: {} };
			const id = getProjectId({ project: projectWithRootId });
			expect(id).toBe("root-id");
		});

		test("returns id from metadata when root id missing", () => {
			const id = getProjectId({ project: v2Project });
			expect(id).toBe("project-v2-123");
		});

		test("prefers root id over metadata id", () => {
			const projectWithBothIds = {
				id: "root-id",
				metadata: { id: "metadata-id" },
			};
			const id = getProjectId({ project: projectWithBothIds });
			expect(id).toBe("root-id");
		});
	});
});
