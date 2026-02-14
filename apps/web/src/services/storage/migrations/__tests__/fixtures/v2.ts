export const v2Project = {
	id: "project-v2-123",
	version: 2,
	metadata: {
		id: "project-v2-123",
		name: "My V2 Project",
		thumbnail: "data:image/png;base64,abc123",
		createdAt: "2024-03-01T10:00:00.000Z",
		updatedAt: "2024-03-01T14:00:00.000Z",
	},
	settings: {
		fps: 30,
		canvasSize: { width: 1920, height: 1080 },
		background: { type: "color", color: "#000000" },
	},
	currentSceneId: "scene-main",
	scenes: [
		{
			id: "scene-main",
			name: "Main scene",
			isMain: true,
			tracks: [
				{
					id: "track-1",
					type: "video",
					name: "Video Track",
					isMain: true,
					elements: [
						{
							id: "element-1",
							type: "video",
							mediaId: "media-1",
							startTime: 0,
							duration: 15.5,
							trimStart: 0,
							trimEnd: 0,
						},
					],
				},
				{
					id: "track-2",
					type: "text",
					name: "Text Track",
					elements: [
						{
							id: "element-2",
							type: "text",
							content: "Hello World",
							startTime: 2,
							duration: 5,
						},
					],
				},
			],
			bookmarks: [5.0, 10.0],
			createdAt: "2024-03-01T10:00:00.000Z",
			updatedAt: "2024-03-01T14:00:00.000Z",
		},
	],
};

export const v2ProjectWithBlurBackground = {
	id: "project-v2-blur",
	version: 2,
	metadata: {
		id: "project-v2-blur",
		name: "Blur Background Project",
		createdAt: "2024-03-15T08:00:00.000Z",
		updatedAt: "2024-03-15T10:00:00.000Z",
	},
	settings: {
		fps: 24,
		canvasSize: { width: 1080, height: 1920 },
		background: { type: "blur", blurIntensity: 25 },
	},
	currentSceneId: "scene-1",
	scenes: [
		{
			id: "scene-1",
			name: "Main scene",
			isMain: true,
			tracks: [
				{
					id: "track-1",
					type: "video",
					isMain: true,
					elements: [
						{
							id: "el-1",
							type: "video",
							mediaId: "m1",
							startTime: 0,
							duration: 30,
						},
					],
				},
			],
			bookmarks: [],
			createdAt: "2024-03-15T08:00:00.000Z",
			updatedAt: "2024-03-15T10:00:00.000Z",
		},
	],
};

export const v2ProjectEmptyScenes = {
	id: "project-v2-empty",
	version: 2,
	metadata: {
		id: "project-v2-empty",
		name: "Empty Scenes Project",
		createdAt: "2024-04-01T00:00:00.000Z",
		updatedAt: "2024-04-01T00:00:00.000Z",
	},
	settings: {
		fps: 30,
		canvasSize: { width: 1920, height: 1080 },
		background: { type: "color", color: "#ffffff" },
	},
	currentSceneId: "",
	scenes: [],
};

export const v2ProjectSceneWithoutTracks = {
	id: "project-v2-no-tracks",
	version: 2,
	metadata: {
		id: "project-v2-no-tracks",
		name: "Scene Without Tracks",
		createdAt: "2024-04-01T00:00:00.000Z",
		updatedAt: "2024-04-01T00:00:00.000Z",
	},
	settings: {
		fps: 30,
		canvasSize: { width: 1920, height: 1080 },
		background: { type: "color", color: "#000000" },
	},
	currentSceneId: "scene-1",
	scenes: [
		{
			id: "scene-1",
			name: "Main Scene",
			isMain: true,
			createdAt: "2024-04-01T00:00:00.000Z",
			updatedAt: "2024-04-01T00:00:00.000Z",
		},
	],
};
