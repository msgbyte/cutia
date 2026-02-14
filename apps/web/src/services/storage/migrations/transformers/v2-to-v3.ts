import { getProjectDurationFromScenes } from "@/lib/scenes";
import type { TScene } from "@/types/timeline";
import type { MigrationResult, ProjectRecord } from "./types";
import { getProjectId, isRecord } from "./utils";

export function transformProjectV2ToV3({
	project,
}: {
	project: ProjectRecord;
}): MigrationResult<ProjectRecord> {
	const projectId = getProjectId({ project });
	if (!projectId) {
		return { project, skipped: true, reason: "no project id" };
	}

	if (isV3Project({ project })) {
		return { project, skipped: true, reason: "already v3" };
	}

	const scenes = getScenes({ project });
	const duration = getProjectDurationFromScenes({ scenes });

	const metadataValue = project.metadata;
	const metadata = isRecord(metadataValue)
		? { ...metadataValue, duration }
		: { duration };

	const migratedProject = {
		...project,
		metadata,
		version: 3,
	};

	return { project: migratedProject, skipped: false };
}

export { getProjectId } from "./utils";

function getScenes({ project }: { project: ProjectRecord }): TScene[] {
	const scenesValue = project.scenes;
	if (!Array.isArray(scenesValue)) {
		return [];
	}

	return scenesValue.filter(isRecord) as unknown as TScene[];
}

function isV3Project({ project }: { project: ProjectRecord }): boolean {
	const versionValue = project.version;
	if (typeof versionValue === "number" && versionValue >= 3) {
		return true;
	}

	return (
		isRecord(project.metadata) && typeof project.metadata.duration === "number"
	);
}
