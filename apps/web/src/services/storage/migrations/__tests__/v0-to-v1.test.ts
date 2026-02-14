import { describe, expect, test } from "bun:test";
import { getProjectId, transformProjectV0ToV1 } from "../transformers/v0-to-v1";
import {
	projectMalformed,
	projectWithNoId,
	v0Project,
	v0ProjectEmpty,
	v0ProjectWithMetadata,
	v1Project,
} from "./fixtures";

describe("V0 to V1 Migration", () => {
	const fixedDate = new Date("2024-06-01T12:00:00.000Z");

	describe("transformProjectV0ToV1", () => {
		test("adds scenes array to v0 project", () => {
			const result = transformProjectV0ToV1({
				project: v0Project,
				options: { now: fixedDate },
			});

			expect(result.skipped).toBe(false);
			expect(result.project.version).toBe(1);
			expect(Array.isArray(result.project.scenes)).toBe(true);
			expect((result.project.scenes as unknown[]).length).toBe(1);
			expect(result.project.currentSceneId).toBeDefined();
		});

		test("creates main scene with correct structure", () => {
			const result = transformProjectV0ToV1({
				project: v0Project,
				options: { now: fixedDate },
			});

			const scenes = result.project.scenes as Array<Record<string, unknown>>;
			const mainScene = scenes[0];

			expect(mainScene.isMain).toBe(true);
			expect(mainScene.name).toBe("Main scene");
			expect(typeof mainScene.id).toBe("string");
			expect(Array.isArray(mainScene.tracks)).toBe(true);
			expect(Array.isArray(mainScene.bookmarks)).toBe(true);
		});

		test("updates metadata.updatedAt when metadata exists", () => {
			const result = transformProjectV0ToV1({
				project: v0ProjectWithMetadata,
				options: { now: fixedDate },
			});

			const metadata = result.project.metadata as Record<string, unknown>;
			expect(metadata.updatedAt).toBe(fixedDate.toISOString());
		});

		test("updates root updatedAt when no metadata", () => {
			const result = transformProjectV0ToV1({
				project: v0ProjectEmpty,
				options: { now: fixedDate },
			});

			expect(result.project.updatedAt).toBe(fixedDate.toISOString());
		});

		test("skips project that already has scenes", () => {
			const result = transformProjectV0ToV1({
				project: v1Project,
				options: { now: fixedDate },
			});

			expect(result.skipped).toBe(true);
			expect(result.reason).toBe("already has scenes");
		});

		test("preserves original project properties", () => {
			const result = transformProjectV0ToV1({
				project: v0Project,
				options: { now: fixedDate },
			});

			expect(result.project.id).toBe(v0Project.id);
			expect(result.project.name).toBe(v0Project.name);
			expect(result.project.fps).toBe(v0Project.fps);
			expect(result.project.canvasSize).toEqual(v0Project.canvasSize);
		});
	});

	describe("getProjectId", () => {
		test("returns id from root level", () => {
			const id = getProjectId({ project: v0Project });
			expect(id).toBe("project-v0-123");
		});

		test("returns id from metadata when root id missing", () => {
			const project = {
				metadata: { id: "from-metadata" },
			};
			const id = getProjectId({ project });
			expect(id).toBe("from-metadata");
		});

		test("returns null when no id found", () => {
			const id = getProjectId({ project: projectWithNoId });
			expect(id).toBe(null);
		});

		test("returns null for malformed project", () => {
			const id = getProjectId({ project: projectMalformed });
			expect(id).toBe("project-malformed");
		});
	});
});
