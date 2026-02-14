import type { ProjectRecord } from "./types";

export function isRecord(value: unknown): value is ProjectRecord {
	return typeof value === "object" && value !== null;
}

export function getProjectId({
	project,
}: {
	project: ProjectRecord;
}): string | null {
	const idValue = project.id;
	if (typeof idValue === "string" && idValue.length > 0) {
		return idValue;
	}

	const metadataValue = project.metadata;
	if (!isRecord(metadataValue)) {
		return null;
	}

	const metadataId = metadataValue.id;
	if (typeof metadataId === "string" && metadataId.length > 0) {
		return metadataId;
	}

	return null;
}
