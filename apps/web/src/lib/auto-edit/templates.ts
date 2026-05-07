import type { TransitionType } from "@/types/timeline";

export type TemplateCutId = "clean-cut" | "story-pulse" | "memory-album";

export interface TemplateCutDefinition {
	id: TemplateCutId;
	name: string;
	description: string;
	imageDuration: number;
	defaultAudioDuration: number;
	maxVideoDuration: number;
	minVideoDuration: number;
	transitionType: TransitionType;
	transitionDuration: number;
	introText: string;
	outroText: string;
}

export const TEMPLATE_CUTS: TemplateCutDefinition[] = [
	{
		id: "clean-cut",
		name: "Clean Cut",
		description: "Balanced pacing with simple dissolves.",
		imageDuration: 3.5,
		defaultAudioDuration: 12,
		maxVideoDuration: 6,
		minVideoDuration: 2.5,
		transitionType: "dissolve",
		transitionDuration: 0.35,
		introText: "Clean Cut",
		outroText: "Keep editing",
	},
	{
		id: "story-pulse",
		name: "Story Pulse",
		description: "Faster pacing with directional wipes.",
		imageDuration: 2.5,
		defaultAudioDuration: 10,
		maxVideoDuration: 4,
		minVideoDuration: 2,
		transitionType: "wipe-left",
		transitionDuration: 0.3,
		introText: "Story Pulse",
		outroText: "Tune the rhythm",
	},
	{
		id: "memory-album",
		name: "Memory Album",
		description: "Longer holds for photos and softer endings.",
		imageDuration: 4.5,
		defaultAudioDuration: 14,
		maxVideoDuration: 7,
		minVideoDuration: 3,
		transitionType: "wipe-up",
		transitionDuration: 0.45,
		introText: "Memory Album",
		outroText: "Add your final touch",
	},
] as const;

export function getTemplateCut({
	templateId,
}: {
	templateId: TemplateCutId;
}): TemplateCutDefinition {
	const template = TEMPLATE_CUTS.find((item) => item.id === templateId);
	if (!template) {
		throw new Error(`Unknown template: ${templateId}`);
	}
	return template;
}
