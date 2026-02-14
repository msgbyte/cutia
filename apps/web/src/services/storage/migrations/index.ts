export { StorageMigration } from "./base";
import { V0toV1Migration } from "./v0-to-v1";
import { V1toV2Migration } from "./v1-to-v2";
import { V2toV3Migration } from "./v2-to-v3";
export { runStorageMigrations } from "./runner";
export type { MigrationProgress } from "./runner";

export const CURRENT_PROJECT_VERSION = 3;

export const migrations = [
	new V0toV1Migration(),
	new V1toV2Migration(),
	new V2toV3Migration(),
];
