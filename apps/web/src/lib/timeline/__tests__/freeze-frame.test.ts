import { describe, expect, spyOn, test } from "bun:test";
import { EditorCore } from "@/core";
import { AddMediaAssetCommand } from "@/lib/commands/media/add-media-asset";
import { storageService } from "@/services/storage/service";
import type { MediaAsset } from "@/types/assets";
import type { TimelineTrack, VideoTrack } from "@/types/timeline";
import {
	findAvailableVideoTrackAbove,
	getVisualSourceTime,
} from "../element-utils";

const videoTrack = ({
	id,
	elements = [],
	isMain = false,
	hidden = false,
}: {
	id: string;
	elements?: VideoTrack["elements"];
	isMain?: boolean;
	hidden?: boolean;
}): VideoTrack => ({
	id,
	name: id,
	type: "video",
	elements,
	isMain,
	muted: false,
	hidden,
});

const imageAsset = (id: string): MediaAsset => ({
	id,
	name: `${id}.png`,
	type: "image",
	file: new File([id], `${id}.png`, { type: "image/png" }),
	size: id.length,
	lastModified: 0,
});

describe("freeze frame timeline decisions", () => {
	test("maps the playhead to the displayed source time", () => {
		const cases = [
			{ trimStart: 0, playbackRate: 1, reversed: false, expected: 2 },
			{ trimStart: 3, playbackRate: 1, reversed: false, expected: 5 },
			{ trimStart: 3, playbackRate: 2, reversed: false, expected: 7 },
			{ trimStart: 3, playbackRate: 2, reversed: true, expected: 15 },
		];

		for (const { expected, ...params } of cases) {
			expect(
				getVisualSourceTime({
					timelineTime: 7,
					startTime: 5,
					duration: 8,
					...params,
				}),
			).toBe(expected);
		}
	});

	test("keeps the reversed first frame inside the source range", () => {
		expect(
			getVisualSourceTime({
				timelineTime: 5,
				startTime: 5,
				duration: 8,
				trimStart: 3,
				playbackRate: 2,
				reversed: true,
			}),
		).toBe(19 - 1e-6);
	});

	test("undo removes only the generated asset", async () => {
		const previousWindow = globalThis.window;
		Object.assign(globalThis, { window: globalThis });
		const editor = EditorCore.getInstance();
		const previousAssets = editor.media.getAssets();
		const deleteMediaAsset = spyOn(
			storageService,
			"deleteMediaAsset",
		).mockResolvedValue();

		try {
			editor.media.setAssets({ assets: [imageAsset("existing")] });
			const command = new AddMediaAssetCommand(
				"project",
				imageAsset("freeze"),
				true,
			);
			command.execute();
			editor.media.setAssets({
				assets: [...editor.media.getAssets(), imageAsset("later")],
			});

			command.undo();

			expect(editor.media.getAssets().map(({ id }) => id)).toEqual([
				"existing",
				"later",
			]);
			await Promise.resolve();
			expect(deleteMediaAsset).toHaveBeenCalledWith({
				projectId: "project",
				id: command.getAssetId(),
			});
		} finally {
			editor.media.setAssets({ assets: previousAssets });
			deleteMediaAsset.mockRestore();
			Object.assign(globalThis, { window: previousWindow });
		}
	});

	test("chooses the nearest non-overlapping video track above the source", () => {
		const tracks: TimelineTrack[] = [
			videoTrack({ id: "far-free" }),
			videoTrack({
				id: "occupied",
				elements: [
					{
						id: "existing",
						type: "image",
						mediaId: "image",
						name: "Existing",
						startTime: 5,
						duration: 1,
						trimStart: 0,
						trimEnd: 0,
						hidden: false,
						transform: { scale: 1, position: { x: 0, y: 0 }, rotate: 0 },
						opacity: 1,
					},
				],
			}),
			{
				id: "text",
				name: "Text",
				type: "text",
				elements: [],
				hidden: false,
			},
			videoTrack({ id: "nearest-free" }),
			videoTrack({ id: "main", isMain: true }),
			videoTrack({ id: "source" }),
		];

		expect(
			findAvailableVideoTrackAbove({
				tracks,
				sourceTrackId: "source",
				startTime: 4,
				endTime: 7,
			}),
		).toBe("nearest-free");
	});

	test("skips hidden video tracks above the source", () => {
		expect(
			findAvailableVideoTrackAbove({
				tracks: [
					videoTrack({ id: "visible" }),
					videoTrack({ id: "hidden", hidden: true }),
					videoTrack({ id: "source" }),
				],
				sourceTrackId: "source",
				startTime: 4,
				endTime: 7,
			}),
		).toBe("visible");
	});

	test("requires a new track when every video track above overlaps", () => {
		const occupied = videoTrack({
			id: "occupied",
			elements: [
				{
					id: "existing",
					type: "image",
					mediaId: "image",
					name: "Existing",
					startTime: 3,
					duration: 6,
					trimStart: 0,
					trimEnd: 0,
					hidden: false,
					transform: { scale: 1, position: { x: 0, y: 0 }, rotate: 0 },
					opacity: 1,
				},
			],
		});

		expect(
			findAvailableVideoTrackAbove({
				tracks: [occupied, videoTrack({ id: "source" })],
				sourceTrackId: "source",
				startTime: 4,
				endTime: 7,
			}),
		).toBeNull();
	});
});
