import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { EditorCore } from "@/core";

export function useEditor(): EditorCore {
	const editor = useMemo(() => EditorCore.getInstance(), []);
	const versionRef = useRef(0);

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const handleStoreChange = () => {
				versionRef.current += 1;
				onStoreChange();
			};

			const unsubscribers = [
				editor.playback.subscribe(handleStoreChange),
				editor.timeline.subscribe(handleStoreChange),
				editor.scenes.subscribe(handleStoreChange),
				editor.project.subscribe(handleStoreChange),
				editor.media.subscribe(handleStoreChange),
				editor.renderer.subscribe(handleStoreChange),
				editor.selection.subscribe(handleStoreChange),
			];

			return () => {
				for (const unsubscribe of unsubscribers) {
					unsubscribe();
				}
			};
		},
		[editor],
	);

	const getSnapshot = useCallback(() => versionRef.current, []);

	useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	return editor;
}
