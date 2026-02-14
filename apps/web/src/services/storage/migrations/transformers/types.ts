/**
 * Type definitions for different project versions used in migrations.
 * These types are intentionally loose (using Record) because we're dealing
 * with potentially malformed data from older versions.
 */

export type ProjectRecord = Record<string, unknown>;

export interface MigrationResult<T> {
	project: T;
	skipped: boolean;
	reason?: string;
}
