export const v0Project = {
	id: "project-v0-123",
	name: "My V0 Project",
	createdAt: "2024-01-15T10:00:00.000Z",
	updatedAt: "2024-01-15T12:00:00.000Z",
	fps: 30,
	canvasSize: { width: 1920, height: 1080 },
	backgroundColor: "#000000",
	backgroundType: "color",
	bookmarks: [1.5, 3.0],
};

export const v0ProjectWithMetadata = {
	id: "project-v0-456",
	metadata: {
		id: "project-v0-456",
		name: "V0 With Metadata",
		createdAt: "2024-02-01T08:00:00.000Z",
		updatedAt: "2024-02-01T09:00:00.000Z",
	},
	fps: 24,
	canvasSize: { width: 1280, height: 720 },
	backgroundType: "blur",
	blurIntensity: 20,
};

export const v0ProjectEmpty = {
	id: "project-empty",
	name: "Empty Project",
	createdAt: "2024-03-01T00:00:00.000Z",
	updatedAt: "2024-03-01T00:00:00.000Z",
};

// Edge cases
export const projectWithNoId = {
	name: "No ID Project",
	version: 1,
	scenes: [],
};

export const projectWithNullValues = {
	id: "project-nulls",
	version: 1,
	name: null,
	metadata: null,
	scenes: null,
	settings: null,
};

export const projectMalformed = {
	id: "project-malformed",
	// Missing almost everything
};
