import { describe, expect, test } from "bun:test";
import { getSelectedClipExportFilename, getSelectedVideoClip } from "../export";
import { createTimelineAudioBuffer } from "../media/audio";
import type { MediaAsset } from "@/types/assets";
import type { TimelineTrack, VideoTrack } from "@/types/timeline";

describe("getSelectedVideoClip", () => {
	test("keeps only the selected video and starts it at zero", () => {
		const track: VideoTrack = {
			id: "video-track",
			name: "Video",
			type: "video",
			isMain: true,
			muted: false,
			hidden: false,
			transitions: [
				{
					id: "transition",
					type: "fade",
					duration: 0.5,
					fromElementId: "first-video",
					toElementId: "selected-video",
				},
			],
			elements: [
				{
					id: "first-video",
					name: "First",
					type: "video",
					mediaId: "first-media",
					startTime: 0,
					duration: 2,
					trimStart: 0,
					trimEnd: 0,
					transform: {
						scale: 1,
						position: { x: 0, y: 0 },
						rotate: 0,
					},
					opacity: 1,
				},
				{
					id: "selected-video",
					name: "Selected",
					type: "video",
					mediaId: "selected-media",
					startTime: 7,
					duration: 3,
					trimStart: 1,
					trimEnd: 2,
					transform: {
						scale: 1.2,
						position: { x: 10, y: 20 },
						rotate: 15,
					},
					opacity: 0.8,
					playbackRate: 2,
					reversed: true,
				},
			],
		};
		const tracks: TimelineTrack[] = [track];

		const clip = getSelectedVideoClip({
			tracks,
			selection: { trackId: "video-track", elementId: "selected-video" },
		});

		expect(clip).toEqual({
			duration: 3,
			tracks: [
				{
					...track,
					transitions: [],
					elements: [
						{
							...track.elements[1],
							startTime: 0,
						},
					],
				},
			],
		});
	});
});

test("names a selected clip with its timeline start and end time", () => {
	expect(
		getSelectedClipExportFilename({
			startTime: 7.5,
			duration: 3.25,
			fps: 24,
			format: "mp4",
		}),
	).toBe("00-00-07-12_to_00-00-10-18.mp4");
});

test("export audio follows video speed and direction", async () => {
	const sourceSamples = Float32Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
	const outputChannels = [new Float32Array(4), new Float32Array(4)];
	const sourceBuffer = {
		numberOfChannels: 1,
		length: sourceSamples.length,
		sampleRate: 4,
		getChannelData: () => sourceSamples,
	} as AudioBuffer;
	const audioContext = {
		decodeAudioData: async () => sourceBuffer,
		createBuffer: () =>
			({
				numberOfChannels: 2,
				length: 4,
				sampleRate: 4,
				getChannelData: (channel: number) => outputChannels[channel],
			}) as AudioBuffer,
	} as AudioContext;
	const mediaAsset = {
		id: "video-media",
		name: "Video",
		type: "video",
		file: new File([], "video.mp4", { type: "video/mp4" }),
	} satisfies MediaAsset;
	const track: VideoTrack = {
		id: "video-track",
		name: "Video",
		type: "video",
		isMain: true,
		muted: false,
		hidden: false,
		transitions: [],
		elements: [
			{
				id: "video",
				name: "Video",
				type: "video",
				mediaId: mediaAsset.id,
				startTime: 0,
				duration: 1,
				trimStart: 0,
				trimEnd: 0,
				transform: {
					scale: 1,
					position: { x: 0, y: 0 },
					rotate: 0,
				},
				opacity: 1,
				playbackRate: 2,
				reversed: true,
			},
		],
	};

	const mixed = await createTimelineAudioBuffer({
		tracks: [track],
		mediaAssets: [mediaAsset],
		duration: 1,
		sampleRate: 4,
		audioContext,
	});

	if (!mixed) throw new Error("Expected mixed audio");
	expect(Array.from(mixed.getChannelData(0))).toEqual([7, 5, 3, 1]);
});
