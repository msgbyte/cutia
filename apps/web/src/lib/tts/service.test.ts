import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { AudioTrack } from "@/types/timeline";
import { generateAndInsertSpeech, generateSpeechFromText } from "./service";

const originalFetch = globalThis.fetch;
const originalAudioContext = globalThis.AudioContext;
const originalCreateObjectURL = URL.createObjectURL;

describe("tts service", () => {
	let decodedBytes: number[] | null;
	let fakeBuffer: AudioBuffer;

	beforeEach(() => {
		decodedBytes = null;
		fakeBuffer = { duration: 2.5 } as AudioBuffer;

		Object.defineProperty(globalThis, "AudioContext", {
			configurable: true,
			value: class FakeAudioContext {
				async decodeAudioData(arrayBuffer: ArrayBuffer) {
					decodedBytes = Array.from(new Uint8Array(arrayBuffer));
					return fakeBuffer;
				}
			},
		});
		URL.createObjectURL = mock(() => "blob:tts-preview");
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		Object.defineProperty(globalThis, "AudioContext", {
			configurable: true,
			value: originalAudioContext,
		});
		URL.createObjectURL = originalCreateObjectURL;
	});

	test("generateSpeechFromText decodes base64 audio returned by the route", async () => {
		const fetchCalls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
		globalThis.fetch = (async (input, init) => {
			fetchCalls.push([input, init]);
			return Response.json({ audio: "AQID" });
		}) as typeof fetch;

		const result = await generateSpeechFromText({
			text: "hello",
			voice: "nova",
		});

		expect(fetchCalls).toHaveLength(1);
		expect(fetchCalls[0]?.[0]).toBe("/api/tts/generate");
		expect(fetchCalls[0]?.[1]).toMatchObject({
			method: "POST",
			headers: { "Content-Type": "application/json" },
		});
		expect(JSON.parse(String(fetchCalls[0]?.[1]?.body))).toEqual({
			text: "hello",
			voice: "nova",
		});
		expect(decodedBytes).toEqual([1, 2, 3]);
		expect(result.duration).toBe(2.5);
		expect(result.buffer).toBe(fakeBuffer);
		expect(result.blob.type).toBe("audio/mpeg");
		expect(Array.from(new Uint8Array(await result.blob.arrayBuffer()))).toEqual(
			[1, 2, 3],
		);
	});

	test("generateAndInsertSpeech uploads generated audio and inserts it into an existing audio track", async () => {
		globalThis.fetch = (async () =>
			Response.json({ audio: "AQID" })) as unknown as typeof fetch;

		const tracks: AudioTrack[] = [
			{
				id: "audio-track-1",
				name: "Audio 1",
				type: "audio",
				muted: false,
				elements: [],
			},
		];
		const addMediaAssetCalls: unknown[] = [];
		const addMediaAssetMock = async (args: unknown) => {
			addMediaAssetCalls.push(args);
			return "media-1";
		};
		let addTrackCallCount = 0;
		const addTrackMock = () => {
			addTrackCallCount++;
			throw new Error("addTrack should not be called");
		};
		const insertElementCalls: unknown[] = [];
		const insertElementMock = (args: unknown) => {
			insertElementCalls.push(args);
		};

		const editor = {
			media: {
				addMediaAsset: addMediaAssetMock,
			},
			project: {
				getActive: () => ({
					metadata: { id: "project-1" },
				}),
			},
			timeline: {
				getTracks: () => tracks,
				addTrack: addTrackMock,
				insertElement: insertElementMock,
			},
		} as unknown as EditorCore;

		const result = await generateAndInsertSpeech({
			editor,
			text: "hello world",
			startTime: 3,
			voice: "default",
		});

		expect(result).toEqual({ duration: 2.5 });
		expect(addMediaAssetCalls).toHaveLength(1);
		expect(addMediaAssetCalls[0]).toMatchObject({
			projectId: "project-1",
			asset: {
				name: "TTS: hello world",
				type: "audio",
				url: "blob:tts-preview",
				duration: 2.5,
				ephemeral: true,
			},
		});
		expect(insertElementCalls).toHaveLength(1);
		expect(insertElementCalls[0]).toMatchObject({
			placement: {
				mode: "explicit",
				trackId: "audio-track-1",
			},
			element: {
				type: "audio",
				sourceType: "upload",
				mediaId: "media-1",
				name: "TTS: hello world",
				duration: 2.5,
				startTime: 3,
				buffer: fakeBuffer,
			},
		});
		expect(addTrackCallCount).toBe(0);
	});

	test("generateAndInsertSpeech creates a new audio track when existing ones overlap", async () => {
		globalThis.fetch = (async () =>
			Response.json({ audio: "AQID" })) as unknown as typeof fetch;

		const tracks: AudioTrack[] = [
			{
				id: "audio-track-1",
				name: "Audio 1",
				type: "audio",
				muted: false,
				elements: [
					{
						id: "audio-el-1",
						type: "audio",
						sourceType: "upload",
						mediaId: "existing-media",
						name: "Existing audio",
						duration: 10,
						startTime: 0,
						trimStart: 0,
						trimEnd: 0,
						volume: 1,
						muted: false,
					},
				],
			},
		];
		const addMediaAssetMock = async () => "media-2";
		const addTrackCalls: unknown[] = [];
		const addTrackMock = (args: unknown) => {
			addTrackCalls.push(args);
			return "audio-track-2";
		};
		const insertElementCalls: unknown[] = [];
		const insertElementMock = (args: unknown) => {
			insertElementCalls.push(args);
		};

		const editor = {
			media: {
				addMediaAsset: addMediaAssetMock,
			},
			project: {
				getActive: () => ({
					metadata: { id: "project-1" },
				}),
			},
			timeline: {
				getTracks: () => tracks,
				addTrack: addTrackMock,
				insertElement: insertElementMock,
			},
		} as unknown as EditorCore;

		await generateAndInsertSpeech({
			editor,
			text: "overlap check",
			startTime: 2,
		});

		expect(addTrackCalls).toEqual([{ type: "audio" }]);
		expect(insertElementCalls[0]).toMatchObject({
			placement: {
				mode: "explicit",
				trackId: "audio-track-2",
			},
		});
	});
});
