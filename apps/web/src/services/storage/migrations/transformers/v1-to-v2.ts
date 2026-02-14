import {
	DEFAULT_BLUR_INTENSITY,
	DEFAULT_CANVAS_SIZE,
	DEFAULT_COLOR,
	DEFAULT_FPS,
} from "@/constants/project-constants";
import { IndexedDBAdapter } from "@/services/storage/indexeddb-adapter";
import type { MediaAssetData } from "@/services/storage/types";
import type {
	AudioElement,
	ImageElement,
	TextElement,
	TimelineTrack,
	Transform,
	VideoElement,
} from "@/types/timeline";
import type { MigrationResult, ProjectRecord } from "./types";
import { getProjectId, isRecord } from "./utils";

interface LegacyTimelineData {
	tracks: unknown[];
	lastModified: string;
}

interface LegacyMediaElement {
	type: "media";
	mediaId: string;
	muted?: boolean;
	[key: string]: unknown;
}

interface LegacyTextElement {
	type: "text";
	x: number;
	y: number;
	rotation: number;
	opacity: number;
	[key: string]: unknown;
}

interface LegacyAudioElement {
	type: "audio";
	mediaId: string;
	[key: string]: unknown;
}

interface LegacyMediaTrack {
	type: "media";
	elements: unknown[];
	[key: string]: unknown;
}

export interface TransformV1ToV2Options {
	loadMediaAsset?: ({
		mediaId,
	}: {
		mediaId: string;
	}) => Promise<MediaAssetData | null>;
}

export async function transformProjectV1ToV2({
	project,
	options = {},
}: {
	project: ProjectRecord;
	options?: TransformV1ToV2Options;
}): Promise<MigrationResult<ProjectRecord>> {
	const projectId = getProjectId({ project });
	if (!projectId) {
		return { project, skipped: true, reason: "no project id" };
	}

	if (isV2Project({ project })) {
		return { project, skipped: true, reason: "already v2" };
	}

	const migratedProject = await migrateProject({
		project,
		projectId,
		loadMediaAsset: options.loadMediaAsset,
	});
	return { project: migratedProject, skipped: false };
}

async function migrateProject({
	project,
	projectId,
	loadMediaAsset,
}: {
	project: ProjectRecord;
	projectId: string;
	loadMediaAsset?: ({
		mediaId,
	}: {
		mediaId: string;
	}) => Promise<MediaAssetData | null>;
}): Promise<ProjectRecord> {
	const createdAt = normalizeDateString({ value: project.createdAt });
	const updatedAt = normalizeDateString({ value: project.updatedAt });
	const metadataValue = project.metadata;

	const metadata = isRecord(metadataValue)
		? {
				id: getStringValue({ value: metadataValue.id, fallback: projectId }),
				name: getStringValue({ value: metadataValue.name, fallback: "" }),
				thumbnail: getStringValue({ value: metadataValue.thumbnail }),
				createdAt: normalizeDateString({ value: metadataValue.createdAt }),
				updatedAt: normalizeDateString({ value: metadataValue.updatedAt }),
			}
		: {
				id: projectId,
				name: getStringValue({ value: project.name, fallback: "" }),
				thumbnail: getStringValue({ value: project.thumbnail }),
				createdAt,
				updatedAt,
			};

	const scenesValue = project.scenes;
	const scenes = Array.isArray(scenesValue) ? scenesValue : [];
	const legacyBookmarks = Array.isArray(project.bookmarks)
		? project.bookmarks
		: null;

	const migratedScenes = await Promise.all(
		scenes.map(async (scene) => {
			if (!isRecord(scene)) {
				return scene;
			}

			const sceneId = getStringValue({ value: scene.id });
			if (!sceneId) {
				return scene;
			}

			const existingTracks = scene.tracks;
			const shouldLoadTracks =
				!Array.isArray(existingTracks) || existingTracks.length === 0;

			if (!shouldLoadTracks) {
				return scene;
			}

			const tracks = await loadTracksFromLegacyDB({
				projectId,
				sceneId,
				isMain: scene.isMain === true,
			});

			const transformedTracks = await transformTracks({
				tracks,
				loadMediaAsset,
			});

			return {
				...scene,
				tracks: transformedTracks,
			};
		}),
	);

	const normalizedScenes = applyLegacyBookmarks({
		scenes: migratedScenes,
		legacyBookmarks,
	});

	const settingsValue = project.settings;
	const settings = isRecord(settingsValue)
		? {
				fps: getNumberValue({
					value: settingsValue.fps,
					fallback: DEFAULT_FPS,
				}),
				canvasSize: getCanvasSizeValue({
					value: settingsValue.canvasSize,
					fallback: DEFAULT_CANVAS_SIZE,
				}),
				background: getBackgroundValue({
					value: settingsValue.background,
				}),
				originalCanvasSize: null,
			}
		: {
				fps: getNumberValue({ value: project.fps, fallback: DEFAULT_FPS }),
				canvasSize: getCanvasSizeValue({
					value: project.canvasSize,
					fallback: DEFAULT_CANVAS_SIZE,
				}),
				background: getBackgroundValue({
					value: project.background,
					backgroundType: project.backgroundType,
					backgroundColor: project.backgroundColor,
					blurIntensity: project.blurIntensity,
				}),
				originalCanvasSize: null,
			};

	const currentSceneId = getCurrentSceneId({
		value: project.currentSceneId,
		scenes: normalizedScenes,
	});

	return {
		...project,
		metadata,
		scenes: normalizedScenes,
		currentSceneId,
		settings,
		version: 2,
	};
}

async function loadTracksFromLegacyDB({
	projectId,
	sceneId,
	isMain,
}: {
	projectId: string;
	sceneId: string;
	isMain: boolean;
}): Promise<unknown[]> {
	if (typeof indexedDB === "undefined") {
		return [];
	}

	const sceneDbName = `video-editor-timelines-${projectId}-${sceneId}`;
	const projectDbName = `video-editor-timelines-${projectId}`;

	const adapter = new IndexedDBAdapter<LegacyTimelineData>(
		sceneDbName,
		"timeline",
		1,
	);

	let data = await adapter.get("timeline");

	if (!data && isMain) {
		const projectAdapter = new IndexedDBAdapter<LegacyTimelineData>(
			projectDbName,
			"timeline",
			1,
		);
		data = await projectAdapter.get("timeline");
	}

	if (!data || !Array.isArray(data.tracks)) {
		return [];
	}

	return data.tracks;
}

async function transformTracks({
	tracks,
	loadMediaAsset,
}: {
	tracks: unknown[];
	loadMediaAsset?: ({
		mediaId,
	}: {
		mediaId: string;
	}) => Promise<MediaAssetData | null>;
}): Promise<TimelineTrack[]> {
	if (!Array.isArray(tracks)) {
		return [];
	}

	let isFirstVideoTrackFound = false;
	const transformedTracks: (TimelineTrack | null)[] = [];

	for (const track of tracks) {
		if (!isRecord(track)) {
			transformedTracks.push(null);
			continue;
		}

		const trackType = track.type;
		if (trackType === "media") {
			const videoTrack = await transformMediaTrack({
				track: track as LegacyMediaTrack,
				loadMediaAsset,
				isMain: !isFirstVideoTrackFound,
			});
			isFirstVideoTrackFound = true;
			transformedTracks.push(videoTrack);
			continue;
		}

		if (trackType === "text") {
			transformedTracks.push(transformTextTrack({ track }));
			continue;
		}

		if (trackType === "audio") {
			transformedTracks.push(transformAudioTrack({ track }));
			continue;
		}

		transformedTracks.push(null);
	}

	return transformedTracks.filter(
		(track): track is TimelineTrack => track !== null,
	);
}

async function transformMediaTrack({
	track,
	loadMediaAsset,
	isMain,
}: {
	track: LegacyMediaTrack;
	loadMediaAsset?: ({
		mediaId,
	}: {
		mediaId: string;
	}) => Promise<MediaAssetData | null>;
	isMain: boolean;
}): Promise<TimelineTrack> {
	const elements = Array.isArray(track.elements) ? track.elements : [];

	const transformedElements = await Promise.all(
		elements.map(async (element) => {
			if (!isRecord(element) || element.type !== "media") {
				return null;
			}

			const mediaElement = element as LegacyMediaElement;
			const mediaId = getStringValue({ value: mediaElement.mediaId });
			if (!mediaId) {
				return null;
			}

			let mediaType: "video" | "image" = "video";
			if (loadMediaAsset) {
				const mediaAsset = await loadMediaAsset({ mediaId });
				if (mediaAsset) {
					mediaType = mediaAsset.type === "image" ? "image" : "video";
				}
			}

			const defaultTransform: Transform = {
				scale: 1,
				position: { x: 0, y: 0 },
				rotate: 0,
			};

			const muted = mediaElement.muted === true;

			if (mediaType === "image") {
				const imageElement: ImageElement = {
					id: getStringValue({ value: element.id, fallback: "" }),
					name: getStringValue({ value: element.name, fallback: "" }),
					type: "image",
					mediaId,
					duration: getNumberValue({ value: element.duration, fallback: 0 }),
					startTime: getNumberValue({
						value: element.startTime,
						fallback: 0,
					}),
					trimStart: getNumberValue({
						value: element.trimStart,
						fallback: 0,
					}),
					trimEnd: getNumberValue({ value: element.trimEnd, fallback: 0 }),
					hidden: false,
					transform: defaultTransform,
					opacity: 1,
				};
				return imageElement;
			}

			const videoElement: VideoElement = {
				id: getStringValue({ value: element.id, fallback: "" }),
				name: getStringValue({ value: element.name, fallback: "" }),
				type: "video",
				mediaId,
				muted,
				hidden: false,
				transform: defaultTransform,
				opacity: 1,
				duration: getNumberValue({ value: element.duration, fallback: 0 }),
				startTime: getNumberValue({ value: element.startTime, fallback: 0 }),
				trimStart: getNumberValue({ value: element.trimStart, fallback: 0 }),
				trimEnd: getNumberValue({ value: element.trimEnd, fallback: 0 }),
			};
			return videoElement;
		}),
	);

	const validElements = transformedElements.filter(
		(el): el is VideoElement | ImageElement => el !== null,
	);

	return {
		id: getStringValue({ value: track.id, fallback: "" }),
		name: getStringValue({ value: track.name, fallback: "" }),
		type: "video",
		elements: validElements,
		isMain,
		muted: false,
		hidden: false,
	};
}

function transformTextTrack({
	track,
}: {
	track: Record<string, unknown>;
}): TimelineTrack {
	const elements = Array.isArray(track.elements) ? track.elements : [];

	const transformedElements = elements
		.map((element): TextElement | null => {
			if (!isRecord(element) || element.type !== "text") {
				return null;
			}

			const textElement = element as LegacyTextElement;
			const x = getNumberValue({ value: textElement.x, fallback: 0 });
			const y = getNumberValue({ value: textElement.y, fallback: 0 });
			const rotation = getNumberValue({
				value: textElement.rotation,
				fallback: 0,
			});
			const opacity = getNumberValue({
				value: textElement.opacity,
				fallback: 1,
			});

			const transform: Transform = {
				scale: 1,
				position: { x, y },
				rotate: rotation,
			};

			return {
				id: getStringValue({ value: element.id, fallback: "" }),
				name: getStringValue({ value: element.name, fallback: "" }),
				type: "text",
				content: getStringValue({ value: textElement.content, fallback: "" }),
				fontSize: getNumberValue({
					value: textElement.fontSize,
					fallback: 16,
				}),
				fontFamily: getStringValue({
					value: textElement.fontFamily,
					fallback: "Arial",
				}),
				color: getStringValue({
					value: textElement.color,
					fallback: "#000000",
				}),
				backgroundColor: getStringValue({
					value: textElement.backgroundColor,
					fallback: "#FFFFFF",
				}),
				textAlign: (getStringValue({
					value: textElement.textAlign,
					fallback: "left",
				}) || "left") as "left" | "center" | "right",
				fontWeight: (getStringValue({
					value: textElement.fontWeight,
					fallback: "normal",
				}) || "normal") as "normal" | "bold",
				fontStyle: (getStringValue({
					value: textElement.fontStyle,
					fallback: "normal",
				}) || "normal") as "normal" | "italic",
				textDecoration: (getStringValue({
					value: textElement.textDecoration,
					fallback: "none",
				}) || "none") as "none" | "underline" | "line-through",
				hidden: false,
				transform,
				opacity,
				duration: getNumberValue({ value: element.duration, fallback: 0 }),
				startTime: getNumberValue({ value: element.startTime, fallback: 0 }),
				trimStart: getNumberValue({ value: element.trimStart, fallback: 0 }),
				trimEnd: getNumberValue({ value: element.trimEnd, fallback: 0 }),
			};
		})
		.filter((el): el is TextElement => el !== null);

	return {
		id: getStringValue({ value: track.id, fallback: "" }),
		name: getStringValue({ value: track.name, fallback: "" }),
		type: "text",
		elements: transformedElements,
		hidden: false,
	};
}

function transformAudioTrack({
	track,
}: {
	track: Record<string, unknown>;
}): TimelineTrack {
	const elements = Array.isArray(track.elements) ? track.elements : [];

	const transformedElements = elements
		.map((element): AudioElement | null => {
			if (!isRecord(element) || element.type !== "audio") {
				return null;
			}

			const audioElement = element as LegacyAudioElement;
			const mediaId = getStringValue({ value: audioElement.mediaId });
			if (!mediaId) {
				return null;
			}

			return {
				id: getStringValue({ value: element.id, fallback: "" }),
				name: getStringValue({ value: element.name, fallback: "" }),
				type: "audio",
				sourceType: "upload",
				mediaId,
				volume: 1,
				duration: getNumberValue({ value: element.duration, fallback: 0 }),
				startTime: getNumberValue({ value: element.startTime, fallback: 0 }),
				trimStart: getNumberValue({ value: element.trimStart, fallback: 0 }),
				trimEnd: getNumberValue({ value: element.trimEnd, fallback: 0 }),
			};
		})
		.filter((el): el is AudioElement => el !== null);

	return {
		id: getStringValue({ value: track.id, fallback: "" }),
		name: getStringValue({ value: track.name, fallback: "" }),
		type: "audio",
		elements: transformedElements,
		muted: false,
	};
}

export { getProjectId } from "./utils";

function getCurrentSceneId({
	value,
	scenes,
}: {
	value: unknown;
	scenes: unknown[];
}): string {
	if (typeof value === "string" && value.length > 0) {
		return value;
	}

	const mainSceneId = findMainSceneId({ scenes });
	if (mainSceneId) {
		return mainSceneId;
	}

	return "";
}

function findMainSceneId({ scenes }: { scenes: unknown[] }): string | null {
	for (const scene of scenes) {
		if (!isRecord(scene)) {
			continue;
		}

		if (scene.isMain === true && typeof scene.id === "string") {
			return scene.id;
		}
	}

	for (const scene of scenes) {
		if (!isRecord(scene)) {
			continue;
		}

		if (typeof scene.id === "string") {
			return scene.id;
		}
	}

	return null;
}

function applyLegacyBookmarks({
	scenes,
	legacyBookmarks,
}: {
	scenes: unknown[];
	legacyBookmarks: unknown[] | null;
}): unknown[] {
	if (!legacyBookmarks || legacyBookmarks.length === 0) {
		return scenes;
	}

	const mainSceneId = findMainSceneId({ scenes });

	return scenes.map((scene) => {
		if (!isRecord(scene)) {
			return scene;
		}

		if (mainSceneId && scene.id !== mainSceneId) {
			return scene;
		}

		if (Array.isArray(scene.bookmarks) && scene.bookmarks.length > 0) {
			return scene;
		}

		return {
			...scene,
			bookmarks: legacyBookmarks,
		};
	});
}

function getBackgroundValue({
	value,
	backgroundType,
	backgroundColor,
	blurIntensity,
}: {
	value?: unknown;
	backgroundType?: unknown;
	backgroundColor?: unknown;
	blurIntensity?: unknown;
}): {
	type: "color" | "blur";
	color?: string;
	blurIntensity?: number;
} {
	if (isRecord(value)) {
		const typeValue = value.type;
		if (typeValue === "blur") {
			return {
				type: "blur",
				blurIntensity: getNumberValue({
					value: value.blurIntensity,
					fallback: DEFAULT_BLUR_INTENSITY,
				}),
			};
		}

		return {
			type: "color",
			color: getStringValue({ value: value.color, fallback: DEFAULT_COLOR }),
		};
	}

	if (backgroundType === "blur") {
		return {
			type: "blur",
			blurIntensity: getNumberValue({
				value: blurIntensity,
				fallback: DEFAULT_BLUR_INTENSITY,
			}),
		};
	}

	return {
		type: "color",
		color: getStringValue({ value: backgroundColor, fallback: DEFAULT_COLOR }),
	};
}

function getCanvasSizeValue({
	value,
	fallback,
}: {
	value: unknown;
	fallback: { width: number; height: number };
}): { width: number; height: number } {
	if (isRecord(value)) {
		const width = getNumberValue({
			value: value.width,
			fallback: fallback.width,
		});
		const height = getNumberValue({
			value: value.height,
			fallback: fallback.height,
		});

		return { width, height };
	}

	return fallback;
}

function getNumberValue({
	value,
	fallback,
}: {
	value: unknown;
	fallback: number;
}): number {
	return typeof value === "number" ? value : fallback;
}

function getStringValue({
	value,
	fallback,
}: {
	value: unknown;
	fallback: string;
}): string;
function getStringValue({
	value,
	fallback,
}: {
	value: unknown;
	fallback?: undefined;
}): string | undefined;
function getStringValue({
	value,
	fallback,
}: {
	value: unknown;
	fallback?: string;
}): string | undefined {
	if (typeof value === "string") {
		return value;
	}

	return fallback;
}

function normalizeDateString({ value }: { value: unknown }): string {
	if (value instanceof Date) {
		return value.toISOString();
	}

	if (typeof value === "string") {
		return value;
	}

	return new Date().toISOString();
}

function isV2Project({ project }: { project: ProjectRecord }): boolean {
	const versionValue = project.version;
	if (typeof versionValue === "number" && versionValue >= 2) {
		return true;
	}

	return isRecord(project.metadata) && isRecord(project.settings);
}
