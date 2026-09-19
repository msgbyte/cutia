import { expect, spyOn, test } from "bun:test";
import * as React from "react";
import * as actions from "@/lib/actions";
import * as keybindings from "@/stores/keybindings-store";
import { useKeybindingsListener } from "./use-keybindings";

test("native clipboard events reach editor actions without intercepting text editing", () => {
	const previousDocument = globalThis.document;
	const previousWindow = globalThis.window;
	let cleanup: (() => void) | undefined;
	let selection = "";
	let freeZone = false;
	const document = Object.assign(new EventTarget(), {
		activeElement: { tagName: "BODY", isContentEditable: false },
		closest: () => (freeZone ? {} : null),
	});
	Object.assign(globalThis, {
		document,
		window: { getSelection: () => selection },
	});
	const state = { ...keybindings.useKeybindingsStore.getState() };
	const store = spyOn(keybindings, "useKeybindingsStore").mockReturnValue(
		state,
	);
	const effect = spyOn(React, "useEffect").mockImplementation((callback) => {
		cleanup = callback() as (() => void) | undefined;
	});
	const invoke = spyOn(actions, "invokeAction").mockImplementation(() => {});
	const file = new File(["image"], "image.png", { type: "image/png" });
	const paste = () => {
		const event = Object.assign(new Event("paste", { cancelable: true }), {
			clipboardData: { files: [file] },
		});
		document.dispatchEvent(event);
		return event;
	};
	try {
		// biome-ignore lint/correctness/useHookAtTopLevel: Effects and the store hook are stubbed to test native event wiring.
		useKeybindingsListener();
		for (const key of ["c", "v"]) {
			const event = Object.assign(new Event("keydown", { cancelable: true }), {
				key,
				code: `Key${key.toUpperCase()}`,
				ctrlKey: true,
				metaKey: true,
			});
			document.dispatchEvent(event);
			expect(event.defaultPrevented).toBe(false);
		}
		expect(invoke).not.toHaveBeenCalled();
		expect(paste().defaultPrevented).toBe(true);
		expect(invoke).toHaveBeenLastCalledWith(
			"paste-copied",
			{ files: [file] },
			"keypress",
		);
		const copy = new Event("copy", { cancelable: true });
		document.dispatchEvent(copy);
		expect(invoke).toHaveBeenLastCalledWith(
			"copy-selected",
			{ event: copy },
			"keypress",
		);
		invoke.mockClear();
		for (const tagName of ["INPUT", "TEXTAREA"]) {
			document.activeElement.tagName = tagName;
			expect(paste().defaultPrevented).toBe(false);
		}
		document.activeElement.tagName = "DIV";
		document.activeElement.isContentEditable = true;
		expect(paste().defaultPrevented).toBe(false);
		document.activeElement.isContentEditable = false;
		selection = "selected text";
		expect(paste().defaultPrevented).toBe(false);
		selection = "";
		freeZone = true;
		expect(paste().defaultPrevented).toBe(false);
		expect(invoke).not.toHaveBeenCalled();
		freeZone = false;
		cleanup?.();
		cleanup = undefined;
		expect(paste().defaultPrevented).toBe(false);
		expect(invoke).not.toHaveBeenCalled();
	} finally {
		cleanup?.();
		invoke.mockRestore();
		effect.mockRestore();
		store.mockRestore();
		Object.assign(globalThis, {
			document: previousDocument,
			window: previousWindow,
		});
	}
});
