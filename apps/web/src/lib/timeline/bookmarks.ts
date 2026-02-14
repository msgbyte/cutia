import { roundToFrame } from "@/lib/time";

export function findBookmarkIndex({
	bookmarks,
	frameTime,
}: {
	bookmarks: number[];
	frameTime: number;
}): number {
	return bookmarks.findIndex(
		(bookmark) => Math.abs(bookmark - frameTime) < 0.001,
	);
}

export function isBookmarkAtTime({
	bookmarks,
	frameTime,
}: {
	bookmarks: number[];
	frameTime: number;
}): boolean {
	return bookmarks.some((bookmark) => Math.abs(bookmark - frameTime) < 0.001);
}

export function toggleBookmarkInArray({
	bookmarks,
	frameTime,
}: {
	bookmarks: number[];
	frameTime: number;
}): number[] {
	const bookmarkIndex = findBookmarkIndex({ bookmarks, frameTime });

	if (bookmarkIndex !== -1) {
		return bookmarks.filter((_, i) => i !== bookmarkIndex);
	}

	return [...bookmarks, frameTime].sort((a, b) => a - b);
}

export function removeBookmarkFromArray({
	bookmarks,
	frameTime,
}: {
	bookmarks: number[];
	frameTime: number;
}): number[] {
	return bookmarks.filter(
		(bookmark) => Math.abs(bookmark - frameTime) >= 0.001,
	);
}

export function getFrameTime({
	time,
	fps,
}: {
	time: number;
	fps: number;
}): number {
	return roundToFrame({ time, fps });
}
