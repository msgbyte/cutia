import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV0ToV1 } from "./transformers/v0-to-v1";

export class V0toV1Migration extends StorageMigration {
	from = 0;
	to = 1;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV0ToV1({ project });
	}
}
