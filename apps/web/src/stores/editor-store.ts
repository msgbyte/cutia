import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TPlatformLayout } from "@/types/editor";
import { DEFAULT_CANVAS_PRESETS } from "@/constants/project-constants";
import type { TCanvasSize } from "@/types/project";

interface LayoutGuideSettings {
	platform: TPlatformLayout | null;
}

interface EditorState {
	isInitializing: boolean;
	isPanelsReady: boolean;
	canvasPresets: TCanvasSize[];
	layoutGuide: LayoutGuideSettings;
	setInitializing: (loading: boolean) => void;
	setPanelsReady: (ready: boolean) => void;
	initializeApp: () => Promise<void>;
	setLayoutGuide: (settings: Partial<LayoutGuideSettings>) => void;
	toggleLayoutGuide: (platform: TPlatformLayout) => void;
}

export const useEditorStore = create<EditorState>()(
	persist(
		(set) => ({
			isInitializing: true,
			isPanelsReady: false,
			canvasPresets: DEFAULT_CANVAS_PRESETS,
			layoutGuide: {
				platform: null,
			},
			setInitializing: (loading) => {
				set({ isInitializing: loading });
			},

			setPanelsReady: (ready) => {
				set({ isPanelsReady: ready });
			},

			initializeApp: async () => {
				set({ isInitializing: true, isPanelsReady: false });

				set({ isPanelsReady: true, isInitializing: false });
			},

			setLayoutGuide: (settings) => {
				set((state) => ({
					layoutGuide: {
						...state.layoutGuide,
						...settings,
					},
				}));
			},

			toggleLayoutGuide: (platform) => {
				set((state) => ({
					layoutGuide: {
						platform: state.layoutGuide.platform === platform ? null : platform,
					},
				}));
			},
		}),
		{
			name: "editor-settings",
			partialize: (state) => ({
				layoutGuide: state.layoutGuide,
			}),
		},
	),
);
