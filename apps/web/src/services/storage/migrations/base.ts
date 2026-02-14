import type { MigrationResult, ProjectRecord } from "./transformers/types";

export abstract class StorageMigration {
	abstract from: number;
	abstract to: number;
	abstract transform(
		project: ProjectRecord,
	): Promise<MigrationResult<ProjectRecord>>;
}
