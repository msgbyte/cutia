import { EditorCore } from "@/core";
import {
	buildVideoElement,
	buildImageElement,
	buildTextElement,
	buildUploadAudioElement,
} from "@/lib/timeline/element-utils";
import type { AgentTool } from "./types";

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

export const getTimelineStateTool: AgentTool = {
	name: "get_timeline_state",
	description:
		"Get the current timeline state including all tracks and their elements with timing information.",
	parameters: {
		type: "object",
		properties: {},
		required: [],
	},
	async execute() {
		const editor = EditorCore.getInstance();
		const tracks = editor.timeline.getTracks();
		const duration = editor.timeline.getTotalDuration();

		const trackDetails = tracks.map((track) => ({
			id: track.id,
			type: track.type,
			name: track.name,
			isMain: "isMain" in track ? track.isMain : false,
			elements: track.elements.map((element) => ({
				id: element.id,
				type: element.type,
				name: element.name,
				startTime: element.startTime,
				duration: element.duration,
				trimStart: element.trimStart,
				trimEnd: element.trimEnd,
				...(element.type === "video"
					? {
							sourceOutPoint:
								element.trimStart +
								element.duration * (element.playbackRate ?? 1),
						}
					: {}),
				...("content" in element ? { content: element.content } : {}),
				...("mediaId" in element ? { mediaId: element.mediaId } : {}),
			})),
		}));

		return {
			success: true,
			message: `Timeline has ${tracks.length} track(s), total duration: ${duration.toFixed(2)}s`,
			data: { tracks: trackDetails, totalDuration: duration },
		};
	},
};

export const addVideoToTimelineTool: AgentTool = {
	name: "add_video_to_timeline",
	description:
		"Add a video or image media asset to the timeline. The media must already exist in the project's media library. Use list_media_assets to find available media IDs.",
	parameters: {
		type: "object",
		properties: {
			mediaId: {
				type: "string",
				description: "The ID of the media asset to add",
			},
			startTime: {
				type: "number",
				description: "Start time in seconds on the timeline (default: 0)",
			},
			duration: {
				type: "number",
				description:
					"Duration in seconds. For trimmed videos, defaults to the selected source range. For other videos, defaults to the original duration. For images, defaults to 5 seconds.",
			},
			trimStart: {
				type: "number",
				description:
					"Source video in-point in seconds. Only supported for videos.",
			},
			sourceOutPoint: {
				type: "number",
				description:
					"Source video out-point in seconds. Only supported for videos. When omitted, duration determines the out-point.",
			},
		},
		required: ["mediaId"],
	},
	async execute(args) {
		const editor = EditorCore.getInstance();
		const mediaId = args.mediaId as string;
		const startTime = (args.startTime as number) ?? 0;

		const assets = editor.media.getAssets();
		const asset = assets.find((a) => a.id === mediaId);
		if (!asset) {
			return { success: false, message: `Media asset '${mediaId}' not found` };
		}

		const isVideo = asset.type === "video";
		const isImage = asset.type === "image";
		if (!isVideo && !isImage) {
			return {
				success: false,
				message: `Media asset '${asset.name}' is type '${asset.type}', expected video or image`,
			};
		}

		const hasSourceRange =
			args.trimStart !== undefined || args.sourceOutPoint !== undefined;
		if (!isVideo && hasSourceRange) {
			return {
				success: false,
				message: "trimStart and sourceOutPoint are only supported for videos",
			};
		}

		let duration = (args.duration as number) ?? asset.duration ?? 5;
		let trimStart = 0;
		let trimEnd = 0;

		if (isVideo && (hasSourceRange || args.duration !== undefined)) {
			const sourceDuration = asset.duration;
			const requestedTrimStart = args.trimStart ?? 0;
			const requestedSourceOutPoint = args.sourceOutPoint;
			if (
				!isFiniteNumber(sourceDuration) ||
				sourceDuration <= 0 ||
				!isFiniteNumber(requestedTrimStart) ||
				requestedTrimStart < 0 ||
				(args.duration !== undefined &&
					(!isFiniteNumber(args.duration) || args.duration <= 0)) ||
				(requestedSourceOutPoint !== undefined &&
					!isFiniteNumber(requestedSourceOutPoint))
			) {
				return {
					success: false,
					message: `Video '${asset.name}' has an invalid source range`,
				};
			}

			trimStart = requestedTrimStart;
			const sourceOutPoint =
				requestedSourceOutPoint ??
				(args.duration !== undefined
					? trimStart + args.duration
					: sourceDuration);
			if (sourceOutPoint <= trimStart || sourceOutPoint > sourceDuration) {
				return {
					success: false,
					message: `Source range must be within 0-${sourceDuration}s and end after trimStart`,
				};
			}

			const sourceClipDuration = sourceOutPoint - trimStart;
			if (
				args.duration !== undefined &&
				requestedSourceOutPoint !== undefined &&
				Math.abs(args.duration - sourceClipDuration) > 0.000001
			) {
				return {
					success: false,
					message: "duration must equal sourceOutPoint - trimStart",
				};
			}

			duration = sourceClipDuration;
			trimEnd = sourceDuration - sourceOutPoint;
		}

		const element = isVideo
			? buildVideoElement({
					mediaId,
					name: asset.name,
					duration,
					startTime,
					trimStart,
					trimEnd,
				})
			: buildImageElement({ mediaId, name: asset.name, duration, startTime });

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});

		return {
			success: true,
			message: `Added ${asset.type} '${asset.name}' to timeline at ${startTime}s (duration: ${duration}s)`,
		};
	},
};

export const addTextToTimelineTool: AgentTool = {
	name: "add_text_to_timeline",
	description:
		"Add a text overlay element to the timeline with customizable content and styling.",
	parameters: {
		type: "object",
		properties: {
			content: {
				type: "string",
				description: "The text content to display",
			},
			startTime: {
				type: "number",
				description: "Start time in seconds on the timeline (default: 0)",
			},
			duration: {
				type: "number",
				description: "Duration in seconds (default: 5)",
			},
			fontSize: {
				type: "number",
				description:
					"Font size from 1 to 38. Rendered pixel size = fontSize × (canvasHeight / 90). On 1080p: Subtitle/caption: ~3-5, Normal text: ~6-10, Title: ~11-15, Large headline: ~16-25. Default: 15.",
			},
			fontFamily: {
				type: "string",
				description:
					"Font family name (default: 'Arial'). Common options: 'Arial', 'Inter', 'Times New Roman', 'Georgia', etc.",
			},
			fontWeight: {
				type: "string",
				description: "Font weight: 'normal' or 'bold' (default: 'normal')",
			},
			fontStyle: {
				type: "string",
				description: "Font style: 'normal' or 'italic' (default: 'normal')",
			},
			color: {
				type: "string",
				description: "Text color as hex string (default: '#ffffff')",
			},
			backgroundColor: {
				type: "string",
				description: "Background color as hex string (default: 'transparent')",
			},
			textAlign: {
				type: "string",
				description:
					"Text alignment: 'left', 'center', or 'right' (default: 'center')",
			},
			positionX: {
				type: "number",
				description:
					"Horizontal pixel offset from canvas center. 0 = center. Positive = right, negative = left. Range depends on canvas width (e.g. -960 to 960 for 1920px wide).",
			},
			positionY: {
				type: "number",
				description:
					"Vertical pixel offset from canvas center. 0 = center. Positive = down, negative = up. Range depends on canvas height (e.g. -540 to 540 for 1080px tall).",
			},
			scale: {
				type: "number",
				description:
					"Transform scale factor (default: 1). Values > 1 enlarge, < 1 shrink.",
			},
			rotate: {
				type: "number",
				description:
					"Rotation angle in degrees (default: 0). Positive = clockwise.",
			},
			opacity: {
				type: "number",
				description:
					"Element opacity from 0 (transparent) to 1 (opaque). Default: 1.",
			},
		},
		required: ["content"],
	},
	async execute(args) {
		const content = args.content as string;
		const startTime = (args.startTime as number) ?? 0;

		const element = buildTextElement({
			raw: {
				content,
				duration: (args.duration as number) ?? 5,
				fontSize: args.fontSize as number | undefined,
				fontFamily: args.fontFamily as string | undefined,
				fontWeight: args.fontWeight as "normal" | "bold" | undefined,
				fontStyle: args.fontStyle as "normal" | "italic" | undefined,
				color: args.color as string | undefined,
				backgroundColor: args.backgroundColor as string | undefined,
				textAlign: args.textAlign as "left" | "center" | "right" | undefined,
				opacity: args.opacity as number | undefined,
				transform: {
					scale: (args.scale as number) ?? 1,
					position: {
						x: (args.positionX as number) ?? 0,
						y: (args.positionY as number) ?? 0,
					},
					rotate: (args.rotate as number) ?? 0,
				},
			},
			startTime,
		});

		const editor = EditorCore.getInstance();
		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});

		return {
			success: true,
			message: `Added text '${content.slice(0, 30)}${content.length > 30 ? "..." : ""}' at ${startTime}s`,
		};
	},
};

export const addAudioToTimelineTool: AgentTool = {
	name: "add_audio_to_timeline",
	description:
		"Add an audio media asset to the timeline. The audio must already exist in the project's media library.",
	parameters: {
		type: "object",
		properties: {
			mediaId: {
				type: "string",
				description: "The ID of the audio media asset to add",
			},
			startTime: {
				type: "number",
				description: "Start time in seconds on the timeline (default: 0)",
			},
			duration: {
				type: "number",
				description:
					"Duration in seconds (defaults to the audio's original duration)",
			},
		},
		required: ["mediaId"],
	},
	async execute(args) {
		const editor = EditorCore.getInstance();
		const mediaId = args.mediaId as string;
		const startTime = (args.startTime as number) ?? 0;

		const assets = editor.media.getAssets();
		const asset = assets.find((a) => a.id === mediaId);
		if (!asset) {
			return { success: false, message: `Media asset '${mediaId}' not found` };
		}

		if (asset.type !== "audio") {
			return {
				success: false,
				message: `Media asset '${asset.name}' is type '${asset.type}', expected audio`,
			};
		}

		const duration = (args.duration as number) ?? asset.duration ?? 5;

		const element = buildUploadAudioElement({
			mediaId,
			name: asset.name,
			duration,
			startTime,
		});

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});

		return {
			success: true,
			message: `Added audio '${asset.name}' at ${startTime}s (duration: ${duration}s)`,
		};
	},
};

export const updateElementTool: AgentTool = {
	name: "update_element",
	description:
		"Update properties of an existing timeline element (transform, opacity, text content, styling, etc.).",
	parameters: {
		type: "object",
		properties: {
			trackId: {
				type: "string",
				description: "The track ID containing the element",
			},
			elementId: {
				type: "string",
				description: "The element ID to update",
			},
			content: {
				type: "string",
				description: "New text content (text elements only)",
			},
			fontSize: {
				type: "number",
				description:
					"Font size from 1 to 38 (text elements only). On 1080p: Subtitle: ~3-5, Normal: ~6-10, Title: ~11-15, Headline: ~16-25.",
			},
			fontFamily: {
				type: "string",
				description:
					"Font family name, e.g. 'Arial', 'Inter' (text elements only)",
			},
			fontWeight: {
				type: "string",
				description: "'normal' or 'bold' (text elements only)",
			},
			fontStyle: {
				type: "string",
				description: "'normal' or 'italic' (text elements only)",
			},
			color: {
				type: "string",
				description: "Text color as hex string (text elements only)",
			},
			backgroundColor: {
				type: "string",
				description: "Background color as hex string (text elements only)",
			},
			textAlign: {
				type: "string",
				description: "'left', 'center', or 'right' (text elements only)",
			},
			opacity: {
				type: "number",
				description: "Element opacity from 0 (transparent) to 1 (opaque)",
			},
			scale: {
				type: "number",
				description: "Transform scale factor. Values > 1 enlarge, < 1 shrink.",
			},
			positionX: {
				type: "number",
				description:
					"Horizontal pixel offset from canvas center. 0 = center. Positive = right, negative = left.",
			},
			positionY: {
				type: "number",
				description:
					"Vertical pixel offset from canvas center. 0 = center. Positive = down, negative = up.",
			},
			rotate: {
				type: "number",
				description: "Rotation angle in degrees. Positive = clockwise.",
			},
		},
		required: ["trackId", "elementId"],
	},
	async execute(args) {
		const editor = EditorCore.getInstance();
		const trackId = args.trackId as string;
		const elementId = args.elementId as string;

		const updates: Record<string, unknown> = {};

		if (args.content !== undefined) updates.content = args.content;
		if (args.fontSize !== undefined) updates.fontSize = args.fontSize;
		if (args.fontFamily !== undefined) updates.fontFamily = args.fontFamily;
		if (args.fontWeight !== undefined) updates.fontWeight = args.fontWeight;
		if (args.fontStyle !== undefined) updates.fontStyle = args.fontStyle;
		if (args.color !== undefined) updates.color = args.color;
		if (args.backgroundColor !== undefined)
			updates.backgroundColor = args.backgroundColor;
		if (args.textAlign !== undefined) updates.textAlign = args.textAlign;
		if (args.opacity !== undefined) updates.opacity = args.opacity;

		const hasTransform =
			args.scale !== undefined ||
			args.positionX !== undefined ||
			args.positionY !== undefined ||
			args.rotate !== undefined;

		if (hasTransform) {
			const track = editor.timeline.getTrackById({ trackId });
			const element = track?.elements.find((e) => e.id === elementId);
			const currentTransform =
				element && "transform" in element
					? element.transform
					: { scale: 1, position: { x: 0, y: 0 }, rotate: 0 };

			updates.transform = {
				scale: (args.scale as number) ?? currentTransform.scale,
				position: {
					x: (args.positionX as number) ?? currentTransform.position.x,
					y: (args.positionY as number) ?? currentTransform.position.y,
				},
				rotate: (args.rotate as number) ?? currentTransform.rotate,
			};
		}

		if (Object.keys(updates).length === 0) {
			return { success: false, message: "No properties to update" };
		}

		editor.timeline.updateElements({
			updates: [{ trackId, elementId, updates }],
		});

		return {
			success: true,
			message: `Updated element: ${Object.keys(updates).join(", ")}`,
		};
	},
};

export const deleteElementTool: AgentTool = {
	name: "delete_element",
	description: "Delete one or more elements from the timeline.",
	parameters: {
		type: "object",
		properties: {
			elements: {
				type: "array",
				description: "Array of elements to delete",
				items: {
					type: "object",
					properties: {
						trackId: { type: "string", description: "Track ID" },
						elementId: { type: "string", description: "Element ID" },
					},
					required: ["trackId", "elementId"],
				},
			},
		},
		required: ["elements"],
	},
	async execute(args) {
		const editor = EditorCore.getInstance();
		const elements = args.elements as Array<{
			trackId: string;
			elementId: string;
		}>;

		if (elements.length === 0) {
			return { success: false, message: "No elements specified" };
		}

		editor.timeline.deleteElements({ elements });

		return {
			success: true,
			message: `Deleted ${elements.length} element(s)`,
		};
	},
};

export const moveElementTool: AgentTool = {
	name: "move_element",
	description:
		"Move an element to a different time position or to a different track.",
	parameters: {
		type: "object",
		properties: {
			sourceTrackId: {
				type: "string",
				description: "Current track ID of the element",
			},
			elementId: {
				type: "string",
				description: "Element ID to move",
			},
			newStartTime: {
				type: "number",
				description: "New start time in seconds",
			},
			targetTrackId: {
				type: "string",
				description:
					"Target track ID (defaults to same track if not specified)",
			},
		},
		required: ["sourceTrackId", "elementId", "newStartTime"],
	},
	async execute(args) {
		const editor = EditorCore.getInstance();
		const sourceTrackId = args.sourceTrackId as string;
		const elementId = args.elementId as string;
		const newStartTime = args.newStartTime as number;
		const targetTrackId = (args.targetTrackId as string) ?? sourceTrackId;

		editor.timeline.moveElement({
			sourceTrackId,
			targetTrackId,
			elementId,
			newStartTime,
		});

		return {
			success: true,
			message: `Moved element to ${newStartTime}s on track ${targetTrackId}`,
		};
	},
};

export const timelineTools: AgentTool[] = [
	getTimelineStateTool,
	addVideoToTimelineTool,
	addTextToTimelineTool,
	addAudioToTimelineTool,
	updateElementTool,
	deleteElementTool,
	moveElementTool,
];
