import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { MediaAsset } from "@/types/assets";
import type { CreateTimelineElement, VideoTrack } from "@/types/timeline";

const videoAsset = {
	id: "video-media",
	name: "Video",
	type: "video",
	file: new File([], "video.mp4", { type: "video/mp4" }),
	duration: 12,
} satisfies MediaAsset;

let tracks: VideoTrack[] = [];
const insertElement = ({ element }: { element: CreateTimelineElement }) => {
	if (element.type !== "video") return;
	tracks = [
		{
			id: "video-track",
			name: "Video",
			type: "video",
			isMain: true,
			muted: false,
			hidden: false,
			elements: [{ ...element, id: "video-element" }],
		},
	];
};
const getTracks = () => tracks;
const getTotalDuration = mock(() => 0);
const editor = {
	media: { getAssets: () => [videoAsset] },
	timeline: { insertElement, getTracks, getTotalDuration },
};

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editor },
}));

const { addVideoToTimelineTool, getTimelineStateTool } = await import(
	"./timeline-tools"
);

describe("timeline video tools", () => {
	beforeEach(() => {
		tracks = [];
		getTotalDuration.mockReset();
		getTotalDuration.mockReturnValue(0);
	});

	test("adds and reports a source subclip", async () => {
		const addResult = await addVideoToTimelineTool.execute({
			mediaId: videoAsset.id,
			startTime: 4,
			trimStart: 2,
			sourceOutPoint: 7,
		});

		expect(addResult.success).toBe(true);
		getTotalDuration.mockReturnValue(9);

		const stateResult = await getTimelineStateTool.execute({});
		const tracks = stateResult.data?.tracks as Array<{
			elements: Array<Record<string, unknown>>;
		}>;

		expect(tracks[0].elements[0]).toMatchObject({
			startTime: 4,
			duration: 5,
			trimStart: 2,
			trimEnd: 5,
			sourceOutPoint: 7,
		});
	});

	test("derives trimEnd when duration selects the first source segment", async () => {
		const addResult = await addVideoToTimelineTool.execute({
			mediaId: videoAsset.id,
			duration: 5,
		});

		expect(addResult.success).toBe(true);

		const stateResult = await getTimelineStateTool.execute({});
		const stateTracks = stateResult.data?.tracks as Array<{
			elements: Array<Record<string, unknown>>;
		}>;

		expect(stateTracks[0].elements[0]).toMatchObject({
			duration: 5,
			trimStart: 0,
			trimEnd: 7,
			sourceOutPoint: 5,
		});
	});

	test("rejects a source range outside the video", async () => {
		const result = await addVideoToTimelineTool.execute({
			mediaId: videoAsset.id,
			trimStart: 10,
			sourceOutPoint: 13,
		});

		expect(result.success).toBe(false);
		expect(tracks).toEqual([]);
	});
});
