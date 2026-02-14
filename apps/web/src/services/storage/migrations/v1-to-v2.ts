import {
	IndexedDBAdapter,
	deleteDatabase,
} from "@/services/storage/indexeddb-adapter";
import type { MediaAssetData } from "@/services/storage/types";
import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import {
	getProjectId,
	transformProjectV1ToV2,
	type TransformV1ToV2Options,
} from "./transformers/v1-to-v2";

export class V1toV2Migration extends StorageMigration {
	from = 1;
	to = 2;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		const projectId = getProjectId({ project });
		if (!projectId) {
			return { project, skipped: true, reason: "no project id" };
		}

		const loadMediaAsset = createMediaAssetLoader({ projectId });

		const result = await transformProjectV1ToV2({
			project,
			options: { loadMediaAsset },
		});

		if (!result.skipped) {
			void cleanupLegacyTimelineDBs({
				projectId,
				project: result.project,
			});
		}

		return result;
	}
}

function createMediaAssetLoader({
	projectId,
}: {
	projectId: string;
}): TransformV1ToV2Options["loadMediaAsset"] {
	return async ({ mediaId }: { mediaId: string }) => {
		const mediaMetadataAdapter = new IndexedDBAdapter<MediaAssetData>(
			`video-editor-media-${projectId}`,
			"media-metadata",
			1,
		);

		return mediaMetadataAdapter.get(mediaId);
	};
}

function cleanupLegacyTimelineDBs({
	projectId,
	project,
}: {
	projectId: string;
	project: ProjectRecord;
}): void {
	const scenes = project.scenes;
	if (!Array.isArray(scenes)) {
		return;
	}

	const dbNamesToDelete: string[] = [];

	for (const scene of scenes) {
		if (typeof scene !== "object" || scene === null) {
			continue;
		}

		const sceneId = scene.id;
		if (typeof sceneId === "string") {
			const sceneDbName = `video-editor-timelines-${projectId}-${sceneId}`;
			dbNamesToDelete.push(sceneDbName);
		}
	}

	const projectDbName = `video-editor-timelines-${projectId}`;
	dbNamesToDelete.push(projectDbName);

	// Fire-and-forget: delete in parallel, don't block migration
	void Promise.all(
		dbNamesToDelete.map((dbName) =>
			deleteDatabase({ dbName }).catch(() => {
				// ignore errors, DB might not exist or already deleted
			}),
		),
	);
}
