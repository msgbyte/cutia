import { buildTrackTransition } from "@/lib/timeline/transition-utils";
import {
	buildImageElement,
	buildUploadAudioElement,
	buildVideoElement,
} from "@/lib/timeline/element-utils";
import type { MediaAsset } from "@/types/assets";
import type {
	AudioElement,
	AudioTrack,
	ImageElement,
	TextTrack,
	TextElement,
	TimelineTrack,
	TrackTransition,
	VideoElement,
	VideoTrack,
} from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import {
	getTemplateCut,
	type TemplateCutDefinition,
	type TemplateCutId,
} from "./templates";

export interface GeneratedTemplateCut {
	template: TemplateCutDefinition;
	tracks: TimelineTrack[];
	transitions: TrackTransition[];
}

const INTRO_DURATION = 2.5;
const OUTRO_DURATION = 2.5;

export function generateTemplateCut({
	templateId,
	assets,
}: {
	templateId: TemplateCutId;
	assets: MediaAsset[];
}): GeneratedTemplateCut {
	const template = getTemplateCut({ templateId });
	const visualAssets = assets.filter(
		(asset) => !asset.ephemeral && (asset.type === "image" || asset.type === "video"),
	);

	if (visualAssets.length === 0) {
		throw new Error("No visual assets");
	}

	let currentTime = 0;
	const visualElements: Array<VideoElement | ImageElement> = visualAssets.map(
		(asset) => {
		const startTime = currentTime;
		const duration =
			asset.type === "image"
				? template.imageDuration
				: clampDuration({
						duration: asset.duration ?? template.maxVideoDuration,
						min: template.minVideoDuration,
						max: template.maxVideoDuration,
					});
		currentTime += duration;

		if (asset.type === "video") {
			return {
				...buildVideoElement({
				mediaId: asset.id,
				name: asset.name,
				duration,
				startTime,
				}),
				id: generateUUID(),
			};
		}

		return {
			...buildImageElement({
			mediaId: asset.id,
			name: asset.name,
			duration,
			startTime,
			}),
			id: generateUUID(),
		};
		},
	);

	const transitions = visualElements.flatMap((element, index) => {
		const nextElement = visualElements[index + 1];
		if (!nextElement) {
			return [];
		}

		return [
			buildTrackTransition({
				type: template.transitionType,
				duration: template.transitionDuration,
				fromElementId: element.id,
				toElementId: nextElement.id,
			}),
		];
	});

	const visualTrack: VideoTrack = {
		id: generateUUID(),
		name: `${template.name} Visuals`,
		type: "video",
		elements: visualElements,
		transitions,
		isMain: true,
		muted: false,
		hidden: false,
	};

	const totalDuration = Math.max(
		currentTime,
		INTRO_DURATION + OUTRO_DURATION,
	);

	const textTrack: TextTrack = {
		id: generateUUID(),
		name: `${template.name} Titles`,
		type: "text",
		hidden: false,
		elements: [
			buildTemplateTextElement({
				name: `${template.name} Intro`,
				content: template.introText,
				startTime: 0,
				duration: INTRO_DURATION,
				fontSize: 20,
				fontWeight: "bold",
				backgroundColor: "#111111cc",
				backgroundPaddingX: 14,
				backgroundPaddingY: 8,
				backgroundBorderRadius: 10,
				positionY: -32,
			}),
			buildTemplateTextElement({
				name: `${template.name} Outro`,
				content: template.outroText,
				startTime: Math.max(totalDuration - OUTRO_DURATION, 0),
				duration: OUTRO_DURATION,
				fontSize: 16,
				backgroundColor: "#11111199",
				backgroundPaddingX: 12,
				backgroundPaddingY: 6,
				backgroundBorderRadius: 10,
				positionY: 36,
			}),
		],
	};

	const tracks: TimelineTrack[] = [visualTrack, textTrack];
	const audioAssets = assets.filter(
		(asset) => !asset.ephemeral && asset.type === "audio",
	);

	if (audioAssets.length > 0) {
		let audioStartTime = 0;
		const audioTrack: AudioTrack = {
			id: generateUUID(),
			name: `${template.name} Audio`,
			type: "audio",
			muted: false,
			elements: audioAssets.map((asset): AudioElement => {
				const duration = asset.duration ?? template.defaultAudioDuration;
				const element = {
					...buildUploadAudioElement({
					mediaId: asset.id,
					name: asset.name,
					duration,
					startTime: audioStartTime,
					}),
					id: generateUUID(),
				};
				audioStartTime += duration;
				return element;
			}),
		};
		tracks.push(audioTrack);
	}

	return {
		template,
		tracks,
		transitions,
	};
}

function clampDuration({
	duration,
	min,
	max,
}: {
	duration: number;
	min: number;
	max: number;
}): number {
	return Math.max(min, Math.min(max, duration));
}

function buildTemplateTextElement({
	name,
	content,
	startTime,
	duration,
	fontSize,
	fontWeight = "normal",
	backgroundColor,
	backgroundPaddingX,
	backgroundPaddingY,
	backgroundBorderRadius,
	positionY,
}: {
	name: string;
	content: string;
	startTime: number;
	duration: number;
	fontSize: number;
	fontWeight?: TextElement["fontWeight"];
	backgroundColor: string;
	backgroundPaddingX: number;
	backgroundPaddingY: number;
	backgroundBorderRadius: number;
	positionY: number;
}): TextElement {
	return {
		id: generateUUID(),
		type: "text",
		name,
		content,
		duration,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		fontSize,
		fontFamily: "Arial",
		color: "#ffffff",
		backgroundColor,
		textAlign: "center",
		fontWeight,
		fontStyle: "normal",
		textDecoration: "none",
		transform: {
			scale: 1,
			position: {
				x: 0,
				y: positionY,
			},
			rotate: 0,
		},
		opacity: 1,
		backgroundPaddingX,
		backgroundPaddingY,
		backgroundBorderRadius,
	};
}
