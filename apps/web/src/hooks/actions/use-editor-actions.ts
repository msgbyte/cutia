"use client";

import { useRef } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaPreviewStore } from "@/stores/media-preview-store";
import { useActionHandler } from "@/hooks/actions/use-action-handler";
import { useEditor } from "../use-editor";
import { useElementSelection } from "../timeline/element/use-element-selection";
import { getElementsAtTime } from "@/lib/timeline";
import { generateAndInsertSpeech } from "@/lib/tts/service";
import { toast } from "sonner";
import { i18next } from "@/lib/i18n";
import { DEFAULT_EXPORT_OPTIONS } from "@/constants/export-constants";
import { getExportFileExtension, getExportMimeType } from "@/lib/export";
import { extractVideoFrame } from "@/lib/media/processing";
import {
	buildImageElement,
	findAvailableVideoTrackAbove,
	getVisualSourceTime,
} from "@/lib/timeline/element-utils";
import {
	AddMediaAssetCommand,
	AddTrackCommand,
	BatchCommand,
	type Command,
	InsertElementCommand,
} from "@/lib/commands";
import { storageService } from "@/services/storage/service";

export function useEditorActions() {
	const editor = useEditor();
	const activeProject = editor.project.getActive();
	const { selectedElements, setElementSelection } = useElementSelection();
	const { clipboard, setClipboard, toggleSnapping } = useTimelineStore();
	const freezeFrameInFlight = useRef(false);

	useActionHandler(
		"toggle-play",
		() => {
			useMediaPreviewStore.getState().clearSelection();
			editor.playback.toggle();
		},
		undefined,
	);

	useActionHandler(
		"stop-playback",
		() => {
			if (editor.playback.getIsPlaying()) {
				editor.playback.toggle();
			}
			editor.playback.seek({ time: 0 });
		},
		undefined,
	);

	useActionHandler(
		"seek-forward",
		(args) => {
			const seconds = args?.seconds ?? 1;
			editor.playback.seek({
				time: Math.min(
					editor.timeline.getTotalDuration(),
					editor.playback.getCurrentTime() + seconds,
				),
			});
		},
		undefined,
	);

	useActionHandler(
		"seek-backward",
		(args) => {
			const seconds = args?.seconds ?? 1;
			editor.playback.seek({
				time: Math.max(0, editor.playback.getCurrentTime() - seconds),
			});
		},
		undefined,
	);

	useActionHandler(
		"frame-step-forward",
		() => {
			const fps = activeProject.settings.fps;
			editor.playback.seek({
				time: Math.min(
					editor.timeline.getTotalDuration(),
					editor.playback.getCurrentTime() + 1 / fps,
				),
			});
		},
		undefined,
	);

	useActionHandler(
		"frame-step-backward",
		() => {
			const fps = activeProject.settings.fps;
			editor.playback.seek({
				time: Math.max(0, editor.playback.getCurrentTime() - 1 / fps),
			});
		},
		undefined,
	);

	useActionHandler(
		"jump-forward",
		(args) => {
			const seconds = args?.seconds ?? 5;
			editor.playback.seek({
				time: Math.min(
					editor.timeline.getTotalDuration(),
					editor.playback.getCurrentTime() + seconds,
				),
			});
		},
		undefined,
	);

	useActionHandler(
		"jump-backward",
		(args) => {
			const seconds = args?.seconds ?? 5;
			editor.playback.seek({
				time: Math.max(0, editor.playback.getCurrentTime() - seconds),
			});
		},
		undefined,
	);

	useActionHandler(
		"goto-start",
		() => {
			editor.playback.seek({ time: 0 });
		},
		undefined,
	);

	useActionHandler(
		"goto-end",
		() => {
			editor.playback.seek({ time: editor.timeline.getTotalDuration() });
		},
		undefined,
	);

	useActionHandler(
		"split",
		() => {
			const currentTime = editor.playback.getCurrentTime();
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks: editor.timeline.getTracks(),
							time: currentTime,
						});

			if (elementsToSplit.length === 0) return;

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
			});
		},
		undefined,
	);

	useActionHandler(
		"split-left",
		() => {
			const currentTime = editor.playback.getCurrentTime();
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks: editor.timeline.getTracks(),
							time: currentTime,
						});

			if (elementsToSplit.length === 0) return;

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
				retainSide: "right",
			});
		},
		undefined,
	);

	useActionHandler(
		"split-right",
		() => {
			const currentTime = editor.playback.getCurrentTime();
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks: editor.timeline.getTracks(),
							time: currentTime,
						});

			if (elementsToSplit.length === 0) return;

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
				retainSide: "left",
			});
		},
		undefined,
	);

	useActionHandler(
		"delete-selected",
		() => {
			if (selectedElements.length === 0) {
				return;
			}
			editor.timeline.deleteElements({
				elements: selectedElements,
			});
			editor.selection.clearSelection();
		},
		undefined,
	);

	useActionHandler(
		"select-all",
		() => {
			const allElements = editor.timeline.getTracks().flatMap((track) =>
				track.elements.map((element) => ({
					trackId: track.id,
					elementId: element.id,
				})),
			);
			setElementSelection({ elements: allElements });
		},
		undefined,
	);

	useActionHandler(
		"duplicate-selected",
		() => {
			editor.timeline.duplicateElements({
				elements: selectedElements,
			});
		},
		undefined,
	);

	useActionHandler(
		"toggle-elements-muted-selected",
		() => {
			editor.timeline.toggleElementsMuted({ elements: selectedElements });
		},
		undefined,
	);

	useActionHandler(
		"toggle-elements-visibility-selected",
		() => {
			editor.timeline.toggleElementsVisibility({ elements: selectedElements });
		},
		undefined,
	);

	useActionHandler(
		"detach-audio",
		() => {
			if (selectedElements.length === 0) return;
			editor.timeline.detachAudio({ elements: selectedElements });
		},
		undefined,
	);

	useActionHandler(
		"toggle-bookmark",
		() => {
			editor.scenes.toggleBookmark({ time: editor.playback.getCurrentTime() });
		},
		undefined,
	);

	useActionHandler(
		"copy-selected",
		() => {
			if (selectedElements.length === 0) return;

			const results = editor.timeline.getElementsWithTracks({
				elements: selectedElements,
			});
			const items = results.map(({ track, element }) => {
				const { ...elementWithoutId } = element;
				return {
					trackId: track.id,
					trackType: track.type,
					element: elementWithoutId,
				};
			});

			setClipboard({ items });
		},
		undefined,
	);

	useActionHandler(
		"export-selected-clip",
		() => {
			if (selectedElements.length !== 1) return;

			const [{ element } = { element: null }] =
				editor.timeline.getElementsWithTracks({ elements: selectedElements });
			if (element?.type !== "video") return;

			const toastId = "export-selected-clip";
			toast.loading(i18next.t("Exporting project"), { id: toastId });

			(async () => {
				const result = await editor.renderer.exportSelectedClip({
					selection: selectedElements[0],
					options: DEFAULT_EXPORT_OPTIONS,
				});

				if (!result.success || !result.buffer) {
					toast.error(i18next.t("Failed to export clip"), {
						id: toastId,
						description: result.error,
					});
					return;
				}

				const blob = new Blob([result.buffer], {
					type: getExportMimeType({ format: DEFAULT_EXPORT_OPTIONS.format }),
				});
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = `${element.name}-clip${getExportFileExtension({ format: DEFAULT_EXPORT_OPTIONS.format })}`;
				document.body.appendChild(link);
				link.click();
				link.remove();
				URL.revokeObjectURL(url);

				toast.success(i18next.t("Clip exported"), { id: toastId });
			})().catch((error) => {
				console.error("Failed to export selected clip:", error);
				toast.error(i18next.t("Failed to export clip"), { id: toastId });
			});
		},
		undefined,
	);

	useActionHandler(
		"freeze-frame",
		(args) => {
			if (freezeFrameInFlight.current) return;

			const sourceRef =
				args ??
				(selectedElements.length === 1 ? selectedElements[0] : undefined);
			if (!sourceRef) {
				toast.warning(i18next.t("Select one video to freeze"));
				return;
			}

			const [source] = editor.timeline.getElementsWithTracks({
				elements: [sourceRef],
			});
			if (
				!source ||
				source.element.type !== "video" ||
				source.track.type !== "video"
			) {
				toast.warning(i18next.t("Select one video to freeze"));
				return;
			}
			const sourceElement = source.element;
			const sourceTrack = source.track;

			const currentTime = editor.playback.getCurrentTime();
			if (
				currentTime < sourceElement.startTime ||
				currentTime >= sourceElement.startTime + sourceElement.duration
			) {
				toast.warning(i18next.t("Move the playhead inside the video"));
				return;
			}

			const sourceAsset = editor.media
				.getAssets()
				.find((asset) => asset.id === sourceElement.mediaId);
			if (!sourceAsset) {
				toast.error(i18next.t("Source video is unavailable"));
				return;
			}

			freezeFrameInFlight.current = true;
			const toastId = "freeze-frame";
			toast.loading(i18next.t("Creating freeze frame"), { id: toastId });

			(async () => {
				let assetId: string | undefined;
				let objectUrl: string | undefined;
				let batchCommand: BatchCommand | undefined;
				let commandStarted = false;
				let committed = false;

				try {
					const sourceTime = getVisualSourceTime({
						timelineTime: currentTime,
						startTime: sourceElement.startTime,
						duration: sourceElement.duration,
						trimStart: sourceElement.trimStart,
						playbackRate: sourceElement.playbackRate,
						reversed: sourceElement.reversed,
					});
					const sourceName = sourceElement.name.replace(/\.[^/.]+$/, "");
					const { file, width, height } = await extractVideoFrame({
						videoFile: sourceAsset.file,
						timeInSeconds: sourceTime,
						fileName: `${sourceName}-freeze-${currentTime.toFixed(3)}.png`,
					});

					objectUrl = URL.createObjectURL(file);
					const asset = {
						name: file.name,
						type: "image" as const,
						file,
						url: objectUrl,
						width,
						height,
					};
					const addMediaCommand = new AddMediaAssetCommand(
						activeProject.metadata.id,
						asset,
						true,
					);
					assetId = addMediaCommand.getAssetId();
					await storageService.saveMediaAsset({
						projectId: activeProject.metadata.id,
						mediaAsset: { ...asset, id: assetId },
					});

					const tracks = editor.timeline.getTracks();
					const sourceTrackIndex = tracks.findIndex(
						(track) => track.id === sourceTrack.id,
					);
					if (sourceTrackIndex < 0)
						throw new Error("Source track is unavailable");

					const duration = 3;
					let targetTrackId = findAvailableVideoTrackAbove({
						tracks,
						sourceTrackId: sourceTrack.id,
						startTime: currentTime,
						endTime: currentTime + duration,
					});
					const commands: Command[] = [addMediaCommand];

					if (!targetTrackId) {
						const addTrackCommand = new AddTrackCommand(
							"video",
							sourceTrackIndex,
						);
						targetTrackId = addTrackCommand.getTrackId();
						commands.push(addTrackCommand);
					}

					const imageElement = buildImageElement({
						mediaId: assetId,
						name: file.name,
						duration,
						startTime: currentTime,
					});
					imageElement.transform = {
						...sourceElement.transform,
						position: { ...sourceElement.transform.position },
					};
					imageElement.opacity = sourceElement.opacity;

					const insertCommand = new InsertElementCommand({
						element: imageElement,
						placement: { mode: "explicit", trackId: targetTrackId },
					});
					commands.push(insertCommand);
					batchCommand = new BatchCommand(commands);
					commandStarted = true;
					editor.command.execute({ command: batchCommand });
					committed = true;

					setElementSelection({
						elements: [
							{
								trackId: targetTrackId,
								elementId: insertCommand.getElementId(),
							},
						],
					});
					toast.success(i18next.t("Freeze frame created"), { id: toastId });
				} catch (error) {
					console.error("Failed to create freeze frame:", error);
					if (commandStarted && !committed) batchCommand?.undo();
					if (!committed && assetId) {
						await storageService
							.deleteMediaAsset({
								projectId: activeProject.metadata.id,
								id: assetId,
							})
							.catch(() => undefined);
					}
					if (!committed && objectUrl) URL.revokeObjectURL(objectUrl);
					toast.error(i18next.t("Failed to create freeze frame"), {
						id: toastId,
					});
				} finally {
					freezeFrameInFlight.current = false;
				}
			})();
		},
		undefined,
	);

	useActionHandler(
		"paste-copied",
		() => {
			if (!clipboard?.items.length) return;

			editor.timeline.pasteAtTime({
				time: editor.playback.getCurrentTime(),
				clipboardItems: clipboard.items,
			});
		},
		undefined,
	);

	useActionHandler(
		"toggle-snapping",
		() => {
			toggleSnapping();
		},
		undefined,
	);

	useActionHandler(
		"convert-to-speech",
		() => {
			const results = editor.timeline.getElementsWithTracks({
				elements: selectedElements,
			});
			const textElements = results.filter(
				({ element }) => element.type === "text",
			);

			if (textElements.length === 0) return;

			const toastId = "convert-to-speech";
			toast.loading(
				i18next.t("Converting {{count}} text to speech...", {
					count: textElements.length,
				}),
				{ id: toastId },
			);

			(async () => {
				let successCount = 0;
				let failCount = 0;

				for (const { element } of textElements) {
					if (element.type !== "text") continue;
					try {
						await generateAndInsertSpeech({
							editor,
							text: element.content,
							startTime: element.startTime,
						});
						successCount++;
					} catch (error) {
						console.error("TTS conversion failed for element:", error);
						failCount++;
					}
				}

				if (failCount === 0) {
					toast.success(
						i18next.t("Converted {{count}} text to speech", {
							count: successCount,
						}),
						{ id: toastId },
					);
				} else {
					toast.warning(
						i18next.t("{{success}} converted, {{fail}} failed", {
							success: successCount,
							fail: failCount,
						}),
						{ id: toastId },
					);
				}
			})();
		},
		undefined,
	);

	useActionHandler(
		"undo",
		() => {
			editor.command.undo();
		},
		undefined,
	);

	useActionHandler(
		"redo",
		() => {
			editor.command.redo();
		},
		undefined,
	);
}
