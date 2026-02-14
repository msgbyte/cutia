import type { TTimeCode } from "@/types/time";

export function roundToFrame({
	time,
	fps,
}: {
	time: number;
	fps: number;
}): number {
	return Math.round(time * fps) / fps;
}

export function formatTimeCode({
	timeInSeconds,
	format = "HH:MM:SS:CS",
	fps,
}: {
	timeInSeconds: number;
	format?: TTimeCode;
	fps?: number;
}): string {
	const hours = Math.floor(timeInSeconds / 3600);
	const minutes = Math.floor((timeInSeconds % 3600) / 60);
	const seconds = Math.floor(timeInSeconds % 60);
	const centiseconds = Math.floor((timeInSeconds % 1) * 100);
	const frames = fps ? Math.floor((timeInSeconds % 1) * fps) : 0;

	switch (format) {
		case "MM:SS":
			return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
		case "HH:MM:SS":
			return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
		case "HH:MM:SS:CS":
			return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${centiseconds.toString().padStart(2, "0")}`;
		case "HH:MM:SS:FF":
			if (!fps) throw new Error("FPS is required for HH:MM:SS:FF format");
			return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
	}
}

export function parseTimeCode({
	timeCode,
	format = "HH:MM:SS:CS",
	fps,
}: {
	timeCode: string;
	format?: TTimeCode;
	fps: number;
}): number | null {
	if (!timeCode || typeof timeCode !== "string") return null;

	const cleanTimeCode = timeCode.trim();

	try {
		switch (format) {
			case "MM:SS": {
				const parts = cleanTimeCode.split(":");
				if (parts.length !== 2) return null;
				const [minutes, seconds] = parts.map((part) => parseInt(part, 10));
				if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
				if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
				return minutes * 60 + seconds;
			}

			case "HH:MM:SS": {
				const parts = cleanTimeCode.split(":");
				if (parts.length !== 3) return null;
				const [hours, minutes, seconds] = parts.map((part) =>
					parseInt(part, 10),
				);
				if (
					Number.isNaN(hours) ||
					Number.isNaN(minutes) ||
					Number.isNaN(seconds)
				)
					return null;
				if (
					hours < 0 ||
					minutes < 0 ||
					seconds < 0 ||
					minutes >= 60 ||
					seconds >= 60
				)
					return null;
				return hours * 3600 + minutes * 60 + seconds;
			}

			case "HH:MM:SS:CS": {
				const parts = cleanTimeCode.split(":");
				if (parts.length !== 4) return null;
				const [hours, minutes, seconds, centiseconds] = parts.map((part) =>
					parseInt(part, 10),
				);
				if (
					Number.isNaN(hours) ||
					Number.isNaN(minutes) ||
					Number.isNaN(seconds) ||
					Number.isNaN(centiseconds)
				)
					return null;
				if (
					hours < 0 ||
					minutes < 0 ||
					seconds < 0 ||
					centiseconds < 0 ||
					minutes >= 60 ||
					seconds >= 60 ||
					centiseconds >= 100
				)
					return null;
				return hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
			}

			case "HH:MM:SS:FF": {
				const parts = cleanTimeCode.split(":");
				if (parts.length !== 4) return null;
				const [hours, minutes, seconds, frames] = parts.map((part) =>
					parseInt(part, 10),
				);
				if (
					Number.isNaN(hours) ||
					Number.isNaN(minutes) ||
					Number.isNaN(seconds) ||
					Number.isNaN(frames)
				)
					return null;
				if (
					hours < 0 ||
					minutes < 0 ||
					seconds < 0 ||
					frames < 0 ||
					minutes >= 60 ||
					seconds >= 60 ||
					frames >= fps
				)
					return null;
				return hours * 3600 + minutes * 60 + seconds + frames / fps;
			}
		}
	} catch {
		return null;
	}
}

export function guessTimeCodeFormat({
	timeCode,
}: {
	timeCode: string;
}): TTimeCode | null {
	if (!timeCode || typeof timeCode !== "string") return null;

	const numbers = timeCode.split(":");

	if (!numbers.every((n) => !Number.isNaN(Number(n)))) return null;

	if (numbers.length === 2) return "MM:SS";
	if (numbers.length === 3) return "HH:MM:SS";
	// todo: how to tell frames apart from cs?
	if (numbers.length === 4) return "HH:MM:SS:FF";

	return null;
}

export function timeToFrame({
	time,
	fps,
}: {
	time: number;
	fps: number;
}): number {
	return Math.round(time * fps);
}

export function frameToTime({
	frame,
	fps,
}: {
	frame: number;
	fps: number;
}): number {
	return frame / fps;
}

export function snapTimeToFrame({
	time,
	fps,
}: {
	time: number;
	fps: number;
}): number {
	if (fps <= 0) return time;
	const frame = timeToFrame({ time, fps });
	return frameToTime({ frame, fps });
}

export function getSnappedSeekTime({
	rawTime,
	duration,
	fps,
}: {
	rawTime: number;
	duration: number;
	fps: number;
}): number {
	const snappedTime = snapTimeToFrame({ time: rawTime, fps });
	return Math.max(0, Math.min(duration, snappedTime));
}

export function getLastFrameTime({
	duration,
	fps,
}: {
	duration: number;
	fps: number;
}): number {
	if (duration <= 0) return 0;
	if (fps <= 0) return duration;
	const frameOffset = 1 / fps;
	return Math.max(0, duration - frameOffset);
}
