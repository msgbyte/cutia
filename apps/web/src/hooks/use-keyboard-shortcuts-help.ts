"use client";

import { useMemo } from "react";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { ACTIONS, type TAction } from "@/lib/actions";
import {
	getPlatformAlternateKey,
	getPlatformSpecialKey,
} from "@/utils/platform";

export interface KeyboardShortcut {
	id: string;
	keys: string[];
	description: string;
	category: string;
	action: TAction;
	icon?: React.ReactNode;
}

function formatKey({ key }: { key: string }): string {
	return key
		.replace("ctrl", getPlatformSpecialKey())
		.replace("alt", getPlatformAlternateKey())
		.replace("shift", "Shift")
		.replace("left", "←")
		.replace("right", "→")
		.replace("up", "↑")
		.replace("down", "↓")
		.replace("space", "Space")
		.replace("home", "Home")
		.replace("enter", "Enter")
		.replace("end", "End")
		.replace("delete", "Delete")
		.replace("backspace", "Backspace")
		.replace("-", "+");
}

export function useKeyboardShortcutsHelp() {
	const { keybindings } = useKeybindingsStore();

	const shortcuts = useMemo(() => {
		const result: KeyboardShortcut[] = [];
		const actionToKeys: Record<string, string[]> = {};

		for (const [key, action] of Object.entries(keybindings)) {
			if (action) {
				if (!actionToKeys[action]) {
					actionToKeys[action] = [];
				}
				actionToKeys[action].push(formatKey({ key }));
			}
		}

		for (const [actionId, keys] of Object.entries(actionToKeys)) {
			if (!isAction(actionId)) continue;

			const actionDef = ACTIONS[actionId];
			result.push({
				id: actionId,
				keys,
				description: actionDef.description,
				category: actionDef.category,
				action: actionId,
			});
		}

		return result.sort((a, b) => {
			if (a.category !== b.category) {
				return a.category.localeCompare(b.category);
			}
			return a.description.localeCompare(b.description);
		});
	}, [keybindings]);

	return {
		shortcuts,
	};
}

function isAction(id: string): id is TAction {
	return id in ACTIONS;
}
