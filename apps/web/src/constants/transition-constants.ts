import type { TransitionType } from "@/types/timeline";

export interface TransitionPreset {
	type: TransitionType;
	label: string;
	category: "fade" | "wipe" | "slide" | "zoom";
}

export const TRANSITION_PRESETS: TransitionPreset[] = [
	{ type: "fade", label: "Fade", category: "fade" },
	{ type: "dissolve", label: "Dissolve", category: "fade" },
	{ type: "wipe-left", label: "Wipe Left", category: "wipe" },
	{ type: "wipe-right", label: "Wipe Right", category: "wipe" },
	{ type: "wipe-up", label: "Wipe Up", category: "wipe" },
	{ type: "wipe-down", label: "Wipe Down", category: "wipe" },
	{ type: "slide-left", label: "Slide Left", category: "slide" },
	{ type: "slide-right", label: "Slide Right", category: "slide" },
	{ type: "slide-up", label: "Slide Up", category: "slide" },
	{ type: "slide-down", label: "Slide Down", category: "slide" },
	{ type: "zoom-in", label: "Zoom In", category: "zoom" },
	{ type: "zoom-out", label: "Zoom Out", category: "zoom" },
];

export const DEFAULT_TRANSITION_DURATION = 0.5;

export const TRANSITION_CATEGORIES = ["fade", "wipe", "slide", "zoom"] as const;

export const TRANSITION_CATEGORY_LABELS: Record<
	(typeof TRANSITION_CATEGORIES)[number],
	string
> = {
	fade: "Fade",
	wipe: "Wipe",
	slide: "Slide",
	zoom: "Zoom",
};
