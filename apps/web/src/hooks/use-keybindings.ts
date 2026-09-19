import { useEffect } from "react";
import { invokeAction } from "@/lib/actions";
import { useKeybindingsStore } from "@/stores/keybindings-store";

/**
 * a composable that hooks to the caller component's
 * lifecycle and hooks to the keyboard events to fire
 * the appropriate actions based on keybindings
 */
export function useKeybindingsListener() {
	const { keybindings, getKeybindingString, keybindingsEnabled, isRecording } =
		useKeybindingsStore();

	useEffect(() => {
		const eventOptions: AddEventListenerOptions = { capture: true };
		const shouldIgnoreEvent = (ev: Event) => {
			if (!keybindingsEnabled || isRecording || ev.defaultPrevented)
				return true;
			const target = ev.target as HTMLElement | null;

			const isInKeybindingFreeZone = target?.closest?.(
				"[data-keybinding-free]",
			);
			if (isInKeybindingFreeZone) return true;

			const activeElement = document.activeElement;
			const isTextInput =
				activeElement &&
				(activeElement.tagName === "INPUT" ||
					activeElement.tagName === "TEXTAREA" ||
					(activeElement as HTMLElement).isContentEditable);

			if (isTextInput) return true;

			return (window.getSelection()?.toString().length ?? 0) > 0;
		};
		const handleKeyDown = (ev: KeyboardEvent) => {
			if (shouldIgnoreEvent(ev)) return;
			const binding = getKeybindingString(ev);
			if (!binding) return;
			const boundAction = keybindings[binding];
			if (!boundAction) return;

			// Let the browser provide clipboard data through native copy/paste events.
			if (
				(binding === "ctrl+c" && boundAction === "copy-selected") ||
				(binding === "ctrl+v" && boundAction === "paste-copied")
			)
				return;

			ev.preventDefault();
			ev.stopPropagation();

			switch (boundAction) {
				case "seek-forward":
					invokeAction("seek-forward", { seconds: 1 }, "keypress");
					break;
				case "seek-backward":
					invokeAction("seek-backward", { seconds: 1 }, "keypress");
					break;
				case "jump-forward":
					invokeAction("jump-forward", { seconds: 5 }, "keypress");
					break;
				case "jump-backward":
					invokeAction("jump-backward", { seconds: 5 }, "keypress");
					break;
				default:
					invokeAction(boundAction, undefined, "keypress");
			}
		};
		const handleCopy = (ev: ClipboardEvent) => {
			if (shouldIgnoreEvent(ev)) return;
			invokeAction("copy-selected", { event: ev }, "keypress");
		};
		const handlePaste = (ev: ClipboardEvent) => {
			if (shouldIgnoreEvent(ev)) return;
			const files = Array.from(ev.clipboardData?.files ?? []);
			ev.preventDefault();
			invokeAction("paste-copied", { files }, "keypress");
		};

		document.addEventListener("keydown", handleKeyDown, eventOptions);
		document.addEventListener("copy", handleCopy, eventOptions);
		document.addEventListener("paste", handlePaste, eventOptions);

		return () => {
			document.removeEventListener("keydown", handleKeyDown, eventOptions);
			document.removeEventListener("copy", handleCopy, eventOptions);
			document.removeEventListener("paste", handlePaste, eventOptions);
		};
	}, [keybindings, getKeybindingString, keybindingsEnabled, isRecording]);
}

/**
 * this composable allows for the UI component to be disabled if the component in question is mounted
 */
export function useKeybindingDisabler() {
	const { disableKeybindings, enableKeybindings } = useKeybindingsStore();

	return {
		disableKeybindings,
		enableKeybindings,
	};
}
