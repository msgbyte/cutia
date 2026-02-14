import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV2ToV3 } from "./transformers/v2-to-v3";

export class V2toV3Migration extends StorageMigration {
	from = 2;
	to = 3;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV2ToV3({ project });
	}
}
