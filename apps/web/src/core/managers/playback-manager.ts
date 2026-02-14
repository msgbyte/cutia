import type { EditorCore } from "@/core";

export class PlaybackManager {
	private isPlaying = false;
	private currentTime = 0;
	private volume = 1;
	private muted = false;
	private previousVolume = 1;
	private isScrubbing = false;
	private listeners = new Set<() => void>();
	private playbackTimer: number | null = null;
	private lastUpdate = 0;

	constructor(private editor: EditorCore) {}

	play(): void {
		const duration = this.editor.timeline.getTotalDuration();

		if (duration > 0) {
			if (this.currentTime >= duration) {
				this.seek({ time: 0 });
			}
		}

		this.isPlaying = true;
		this.startTimer();
		this.notify();
	}

	pause(): void {
		this.isPlaying = false;
		this.stopTimer();
		this.notify();
	}

	toggle(): void {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	seek({ time }: { time: number }): void {
		const duration = this.editor.timeline.getTotalDuration();
		this.currentTime = Math.max(0, Math.min(duration, time));
		this.notify();

		window.dispatchEvent(
			new CustomEvent("playback-seek", {
				detail: { time: this.currentTime },
			}),
		);
	}

	setVolume({ volume }: { volume: number }): void {
		const clampedVolume = Math.max(0, Math.min(1, volume));
		this.volume = clampedVolume;
		this.muted = clampedVolume === 0;
		if (clampedVolume > 0) {
			this.previousVolume = clampedVolume;
		}
		this.notify();
	}

	mute(): void {
		if (this.volume > 0) {
			this.previousVolume = this.volume;
		}
		this.muted = true;
		this.volume = 0;
		this.notify();
	}

	unmute(): void {
		this.muted = false;
		this.volume = this.previousVolume;
		this.notify();
	}

	toggleMute(): void {
		if (this.muted) {
			this.unmute();
		} else {
			this.mute();
		}
	}

	getIsPlaying(): boolean {
		return this.isPlaying;
	}

	getCurrentTime(): number {
		return this.currentTime;
	}

	getVolume(): number {
		return this.volume;
	}

	isMuted(): boolean {
		return this.muted;
	}

	setScrubbing({ isScrubbing }: { isScrubbing: boolean }): void {
		this.isScrubbing = isScrubbing;
		this.notify();
	}

	getIsScrubbing(): boolean {
		return this.isScrubbing;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => fn());
	}

	private startTimer(): void {
		if (this.playbackTimer) {
			cancelAnimationFrame(this.playbackTimer);
		}

		this.lastUpdate = performance.now();
		this.updateTime();
	}

	private stopTimer(): void {
		if (this.playbackTimer) {
			cancelAnimationFrame(this.playbackTimer);
			this.playbackTimer = null;
		}
	}

	private updateTime = (): void => {
		if (!this.isPlaying) return;

		const now = performance.now();
		const delta = (now - this.lastUpdate) / 1000;
		this.lastUpdate = now;

		const newTime = this.currentTime + delta;
		const duration = this.editor.timeline.getTotalDuration();

		if (duration > 0 && newTime >= duration) {
			this.pause();
			this.currentTime = duration;
			this.notify();

			window.dispatchEvent(
				new CustomEvent("playback-seek", {
					detail: { time: duration },
				}),
			);
		} else {
			this.currentTime = newTime;
			this.notify();

			window.dispatchEvent(
				new CustomEvent("playback-update", {
					detail: { time: newTime },
				}),
			);
		}

		this.playbackTimer = requestAnimationFrame(this.updateTime);
	};
}
