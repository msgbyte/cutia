import type { KeybindingConfig, ShortcutKey } from "@/types/keybinding";
import type { TActionWithOptionalArgs } from "@/lib/actions";

interface V2State {
	keybindings: KeybindingConfig;
	isCustomized: boolean;
}

export function v2ToV3({ state }: { state: unknown }): unknown {
	const v2 = state as V2State;

	const renames: Record<string, string> = {
		"split-selected": "split",
		"split-selected-left": "split-left",
		"split-selected-right": "split-right",
	};

	const migrated = { ...v2.keybindings };
	for (const [key, action] of Object.entries(migrated)) {
		if (action && renames[action]) {
			migrated[key as ShortcutKey] = renames[action] as TActionWithOptionalArgs;
		}
	}

	return { ...v2, keybindings: migrated };
}
