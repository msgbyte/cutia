"use client";

import { useEditor } from "@/hooks/use-editor";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";
import AudioWaveform from "./audio-waveform";
import { useTimelineElementResize } from "@/hooks/timeline/element/use-element-resize";
import type { SnapPoint } from "@/hooks/timeline/use-timeline-snapping";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import {
	getTrackClasses,
	getTrackHeight,
	canElementHaveAudio,
	canElementBeHidden,
	hasMediaId,
} from "@/lib/timeline";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuCheckboxItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "../../../ui/context-menu";
import type {
	TimelineElement as TimelineElementType,
	TimelineTrack,
	ElementDragState,
	VideoElement,
} from "@/types/timeline";
import type { MediaAsset } from "@/types/assets";
import { mediaSupportsAudio } from "@/lib/media/media-utils";
import { getActionDefinition, type TAction, invokeAction } from "@/lib/actions";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import Image from "next/image";
import {
	ScissorIcon,
	Delete02Icon,
	Copy01Icon,
	ViewIcon,
	ViewOffSlashIcon,
	VolumeHighIcon,
	VolumeOffIcon,
	VolumeMute02Icon,
	Search01Icon,
	Exchange01Icon,
	MusicNote03Icon,
	FlipHorizontalIcon,
	ArrowTurnBackwardIcon,
	Edit02Icon,
	AiVoiceGeneratorIcon,
	SnowIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { uppercase } from "@/utils/string";
import { useTranslation } from "@i18next-toolkit/nextjs-approuter";
import type { ComponentProps } from "react";
import { VideoThumbnailStrip } from "./video-thumbnail-strip";
import { Download } from "lucide-react";

function getDisplayShortcut(action: TAction) {
	const { defaultShortcuts } = getActionDefinition(action);
	if (!defaultShortcuts?.length) {
		return "";
	}

	return uppercase({
		string: defaultShortcuts[0].replace("+", " "),
	});
}

interface TimelineElementProps {
	element: TimelineElementType;
	track: TimelineTrack;
	zoomLevel: number;
	isSelected: boolean;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
	onResizeStateChange?: (params: { isResizing: boolean }) => void;
	onElementMouseDown: (
		e: React.MouseEvent,
		element: TimelineElementType,
	) => void;
	onElementClick: (e: React.MouseEvent, element: TimelineElementType) => void;
	dragState: ElementDragState;
}

export function TimelineElement({
	element,
	track,
	zoomLevel,
	isSelected,
	onSnapPointChange,
	onResizeStateChange,
	onElementMouseDown,
	onElementClick,
	dragState,
}: TimelineElementProps) {
	const { t } = useTranslation();
	const editor = useEditor();
	const { selectedElements } = useElementSelection();
	const { requestRevealMedia } = useAssetsPanelStore();

	const mediaAssets = editor.media.getAssets();
	let mediaAsset: MediaAsset | null = null;

	if (hasMediaId(element)) {
		mediaAsset =
			mediaAssets.find((asset) => asset.id === element.mediaId) ?? null;
	}

	const hasAudio = mediaSupportsAudio({ media: mediaAsset });

	const { handleResizeStart, isResizing, currentStartTime, currentDuration } =
		useTimelineElementResize({
			element,
			track,
			zoomLevel,
			onSnapPointChange,
			onResizeStateChange,
		});

	const isCurrentElementSelected = selectedElements.some(
		(selected) =>
			selected.elementId === element.id && selected.trackId === track.id,
	);

	const isBeingDragged = dragState.elementId === element.id;
	const isBatchDragged =
		!isBeingDragged &&
		dragState.isDragging &&
		isCurrentElementSelected &&
		selectedElements.length > 1;
	const timeDelta =
		dragState.isDragging
			? dragState.currentTime - dragState.startElementTime
			: 0;
	const dragOffsetY =
		isBeingDragged && dragState.isDragging
			? dragState.currentMouseY - dragState.startMouseY
			: 0;
	const elementStartTime =
		isBeingDragged && dragState.isDragging
			? dragState.currentTime
			: isBatchDragged
				? Math.max(0, element.startTime + timeDelta)
				: element.startTime;
	const displayedStartTime = isResizing ? currentStartTime : elementStartTime;
	const displayedDuration = isResizing ? currentDuration : element.duration;
	const elementWidth =
		displayedDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
	const elementLeft = displayedStartTime * 50 * zoomLevel;

	const handleRevealInMedia = ({ event }: { event: React.MouseEvent }) => {
		event.stopPropagation();
		if (hasMediaId(element)) {
			requestRevealMedia(element.mediaId);
		}
	};

	const isMuted = canElementHaveAudio(element) && element.muted === true;

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div
					className={`absolute top-0 h-full select-none ${
						isBeingDragged ? "z-30" : "z-10"
					}`}
					style={{
						left: `${elementLeft}px`,
						width: `${elementWidth}px`,
						transform:
							isBeingDragged && dragState.isDragging
								? `translate3d(0, ${dragOffsetY}px, 0)`
								: undefined,
					}}
				>
					<ElementInner
						element={element}
						track={track}
						zoomLevel={zoomLevel}
						isSelected={isSelected}
						isBeingDragged={isBeingDragged}
						hasAudio={hasAudio}
						isMuted={isMuted}
						mediaAssets={mediaAssets}
						onElementClick={onElementClick}
						onElementMouseDown={onElementMouseDown}
						handleResizeStart={handleResizeStart}
					/>
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent className="z-200 w-64">
				<ActionMenuItem
					action="split"
					icon={<HugeiconsIcon icon={ScissorIcon} />}
				>
					{t("Split")}
				</ActionMenuItem>
				{element.type === "video" && (
					<ContextMenuItem
						icon={<HugeiconsIcon icon={SnowIcon} />}
						onClick={(event) => {
							event.stopPropagation();
							invokeAction("freeze-frame", {
								trackId: track.id,
								elementId: element.id,
							});
						}}
					>
						{t("Freeze frame")}
					</ContextMenuItem>
				)}
				<CopyMenuItem />
				{element.type === "video" && selectedElements.length === 1 && (
					<ActionMenuItem
						action="export-selected-clip"
						icon={<Download className="size-4" />}
					>
						{t("Export selected clip")}
					</ActionMenuItem>
				)}
				{canElementHaveAudio(element) && hasAudio && (
					<>
						<MuteMenuItem
							isMultipleSelected={selectedElements.length > 1}
							isCurrentElementSelected={isCurrentElementSelected}
							isMuted={isMuted}
						/>
						{element.type === "video" && (
							<ActionMenuItem
								action="detach-audio"
								icon={<HugeiconsIcon icon={MusicNote03Icon} />}
							>
								{t("Detach audio")}
							</ActionMenuItem>
						)}
					</>
				)}
				{element.type === "video" && selectedElements.length === 1 && (
					<VideoEditSubmenu
						element={element as VideoElement}
						trackId={track.id}
					/>
				)}
				{element.type === "text" && (
					<ActionMenuItem
						action="convert-to-speech"
						icon={<HugeiconsIcon icon={AiVoiceGeneratorIcon} />}
					>
						{selectedElements.length > 1
							? t("Convert {{count}} to speech", {
									count: selectedElements.length,
								})
							: t("Convert to speech")}
					</ActionMenuItem>
				)}
				{canElementBeHidden(element) && (
					<VisibilityMenuItem
						element={element}
						isMultipleSelected={selectedElements.length > 1}
						isCurrentElementSelected={isCurrentElementSelected}
					/>
				)}
				{selectedElements.length === 1 && (
					<ActionMenuItem
						action="duplicate-selected"
						icon={<HugeiconsIcon icon={Copy01Icon} />}
					>
						{t("Duplicate")}
					</ActionMenuItem>
				)}
				{selectedElements.length === 1 && hasMediaId(element) && (
					<>
						<ContextMenuItem
							icon={<HugeiconsIcon icon={Search01Icon} />}
							onClick={(event) => handleRevealInMedia({ event })}
						>
							{t("Reveal media")}
						</ContextMenuItem>
						<ContextMenuItem
							icon={<HugeiconsIcon icon={Exchange01Icon} />}
							disabled
						>
							{t("Replace media")}
						</ContextMenuItem>
					</>
				)}
				<ContextMenuSeparator />
				<DeleteMenuItem
					isMultipleSelected={selectedElements.length > 1}
					isCurrentElementSelected={isCurrentElementSelected}
					elementType={element.type}
					selectedCount={selectedElements.length}
				/>
			</ContextMenuContent>
		</ContextMenu>
	);
}

function ElementInner({
	element,
	track,
	zoomLevel,
	isSelected,
	isBeingDragged,
	hasAudio,
	isMuted,
	mediaAssets,
	onElementClick,
	onElementMouseDown,
	handleResizeStart,
}: {
	element: TimelineElementType;
	track: TimelineTrack;
	zoomLevel: number;
	isSelected: boolean;
	isBeingDragged: boolean;
	hasAudio: boolean;
	isMuted: boolean;
	mediaAssets: MediaAsset[];
	onElementClick: (e: React.MouseEvent, element: TimelineElementType) => void;
	onElementMouseDown: (
		e: React.MouseEvent,
		element: TimelineElementType,
	) => void;
	handleResizeStart: (params: {
		e: React.MouseEvent;
		elementId: string;
		side: "left" | "right";
	}) => void;
}) {
	return (
		<div
			className={`relative h-full cursor-pointer overflow-hidden rounded-[0.5rem] ${getTrackClasses(
				{
					type: track.type,
				},
			)} ${isBeingDragged ? "z-30" : "z-10"} ${canElementBeHidden(element) && element.hidden ? "opacity-50" : ""}`}
		>
			<button
				type="button"
				className="absolute inset-0 size-full cursor-pointer"
				onClick={(e) => onElementClick(e, element)}
				onMouseDown={(e) => onElementMouseDown(e, element)}
			>
				<div className="absolute inset-0 flex h-full items-center">
					<ElementContent
						element={element}
						track={track}
						zoomLevel={zoomLevel}
						mediaAssets={mediaAssets}
					/>
				</div>

				{canElementBeHidden(element) && element.hidden && (
					<div className="bg-opacity-50 pointer-events-none absolute inset-0 flex items-center justify-center bg-black">
						<HugeiconsIcon
							icon={ViewOffSlashIcon}
							className="size-6 text-white"
						/>
					</div>
				)}
				{hasAudio && isMuted && (
					<div className="pointer-events-none absolute right-1 bottom-1 flex items-center justify-center rounded bg-black/60 p-0.5">
						<HugeiconsIcon
							icon={VolumeOffIcon}
							className="size-3.5 text-white"
						/>
					</div>
				)}
			</button>

			{isSelected && (
				<>
					<div className="border-primary pointer-events-none absolute inset-0 z-20 rounded-[0.5rem] border-2" />
					<ResizeHandle
						side="left"
						elementId={element.id}
						handleResizeStart={handleResizeStart}
					/>
					<ResizeHandle
						side="right"
						elementId={element.id}
						handleResizeStart={handleResizeStart}
					/>
				</>
			)}
		</div>
	);
}

function ResizeHandle({
	side,
	elementId,
	handleResizeStart,
}: {
	side: "left" | "right";
	elementId: string;
	handleResizeStart: (params: {
		e: React.MouseEvent;
		elementId: string;
		side: "left" | "right";
	}) => void;
}) {
	const isLeft = side === "left";
	return (
		<button
			type="button"
			className={`bg-primary absolute top-0 bottom-0 z-50 flex w-[0.6rem] items-center justify-center ${isLeft ? "left-0 cursor-w-resize" : "right-0 cursor-e-resize"}`}
			onMouseDown={(e) => handleResizeStart({ e, elementId, side })}
			aria-label={`${isLeft ? "Left" : "Right"} resize handle`}
		>
			<div className="bg-foreground h-[1.5rem] w-[0.2rem] rounded-full" />
		</button>
	);
}

function ElementContent({
	element,
	track,
	zoomLevel,
	mediaAssets,
}: {
	element: TimelineElementType;
	track: TimelineTrack;
	zoomLevel: number;
	mediaAssets: MediaAsset[];
}) {
	if (element.type === "text") {
		return (
			<div className="flex size-full items-center justify-start pl-2">
				<span className="truncate text-xs text-white">{element.content}</span>
			</div>
		);
	}

	if (element.type === "sticker") {
		return (
			<div className="flex size-full items-center gap-2 pl-2">
				<Image
					src={`https://api.iconify.design/${element.iconName}.svg?width=20&height=20`}
					alt={element.name}
					className="size-5 shrink-0"
					width={20}
					height={20}
					unoptimized
				/>
				<span className="truncate text-xs text-white">{element.name}</span>
			</div>
		);
	}

	if (element.type === "audio") {
		const audioBuffer = element.buffer;
		const audioBlob =
			element.sourceType === "upload"
				? mediaAssets.find((asset) => asset.id === element.mediaId)?.file
				: undefined;

		const audioUrl =
			element.sourceType === "library"
				? element.sourceUrl
				: mediaAssets.find((asset) => asset.id === element.mediaId)?.url;

		if (audioBuffer || audioUrl) {
			return (
				<div className="flex size-full items-center gap-2">
					<div className="min-w-0 flex-1">
						<AudioWaveform
							audioBuffer={audioBuffer}
							audioBlob={audioBlob}
							audioUrl={audioUrl}
							duration={element.duration}
							volume={element.volume}
							height={24}
							className="w-full"
						/>
					</div>
				</div>
			);
		}

		return (
			<span className="text-foreground/80 truncate text-xs">
				{element.name}
			</span>
		);
	}

	const mediaAsset = mediaAssets.find((asset) => asset.id === element.mediaId);
	if (!mediaAsset) {
		return (
			<span className="text-foreground/80 truncate text-xs">
				{element.name}
			</span>
		);
	}

	if (mediaAsset.type === "video" && mediaAsset.file) {
		const trackHeight = getTrackHeight({ type: track.type });
		const elementWidth =
			element.duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

		return (
			<div className="relative size-full">
				<VideoThumbnailStrip
					mediaId={element.mediaId}
					file={mediaAsset.file}
					thumbnailUrl={mediaAsset.thumbnailUrl}
					trimStart={element.trimStart}
					duration={element.duration}
					elementWidth={elementWidth}
					trackHeight={trackHeight}
					zoomLevel={zoomLevel}
					fps={mediaAsset.fps ?? 30}
					mediaWidth={mediaAsset.width ?? 1920}
					mediaHeight={mediaAsset.height ?? 1080}
				/>
			</div>
		);
	}

	if (mediaAsset.type === "image" && mediaAsset.url) {
		return (
			<div
				className="absolute inset-0"
				style={{
					backgroundImage: `url(${mediaAsset.url})`,
					backgroundRepeat: "no-repeat",
					backgroundSize: "cover",
					backgroundPosition: "center",
					pointerEvents: "none",
				}}
			/>
		);
	}

	return (
		<span className="text-foreground/80 truncate text-xs">{element.name}</span>
	);
}

function CopyMenuItem() {
	const { t } = useTranslation();
	return (
		<ActionMenuItem
			action="copy-selected"
			icon={<HugeiconsIcon icon={Copy01Icon} />}
		>
			{t("Copy")}
		</ActionMenuItem>
	);
}

function MuteMenuItem({
	isMultipleSelected,
	isCurrentElementSelected,
	isMuted,
}: {
	isMultipleSelected: boolean;
	isCurrentElementSelected: boolean;
	isMuted: boolean;
}) {
	const getIcon = () => {
		if (isMultipleSelected && isCurrentElementSelected) {
			return <HugeiconsIcon icon={VolumeMute02Icon} />;
		}
		return isMuted ? (
			<HugeiconsIcon icon={VolumeHighIcon} />
		) : (
			<HugeiconsIcon icon={VolumeOffIcon} />
		);
	};

	const { t } = useTranslation();
	return (
		<ActionMenuItem action="toggle-elements-muted-selected" icon={getIcon()}>
			{isMuted ? t("Unmute") : t("Mute")}
		</ActionMenuItem>
	);
}

function VisibilityMenuItem({
	element,
	isMultipleSelected,
	isCurrentElementSelected,
}: {
	element: TimelineElementType;
	isMultipleSelected: boolean;
	isCurrentElementSelected: boolean;
}) {
	const isHidden = canElementBeHidden(element) && element.hidden;

	const getIcon = () => {
		if (isMultipleSelected && isCurrentElementSelected) {
			return <HugeiconsIcon icon={ViewOffSlashIcon} />;
		}
		return isHidden ? (
			<HugeiconsIcon icon={ViewIcon} />
		) : (
			<HugeiconsIcon icon={ViewOffSlashIcon} />
		);
	};

	const { t } = useTranslation();
	return (
		<ActionMenuItem
			action="toggle-elements-visibility-selected"
			icon={getIcon()}
		>
			{isHidden ? t("Show") : t("Hide")}
		</ActionMenuItem>
	);
}

function DeleteMenuItem({
	isMultipleSelected,
	isCurrentElementSelected,
	elementType,
	selectedCount,
}: {
	isMultipleSelected: boolean;
	isCurrentElementSelected: boolean;
	elementType: TimelineElementType["type"];
	selectedCount: number;
}) {
	const { t } = useTranslation();
	return (
		<ActionMenuItem
			action="delete-selected"
			variant="destructive"
			icon={<HugeiconsIcon icon={Delete02Icon} />}
		>
			{isMultipleSelected && isCurrentElementSelected
				? t("Delete {{count}} elements", { count: selectedCount })
				: t("Delete {{type}}", {
						type: elementType === "text" ? t("text") : t("clip"),
					})}
		</ActionMenuItem>
	);
}

function VideoEditSubmenu({
	element,
	trackId,
}: {
	element: VideoElement;
	trackId: string;
}) {
	const { t } = useTranslation();
	const editor = useEditor();

	const isMirrored = element.transform.flipX === true;
	const isReversed = element.reversed === true;

	const toggleMirror = (event: React.MouseEvent) => {
		event.stopPropagation();
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					updates: {
						transform: {
							...element.transform,
							flipX: !isMirrored,
						},
					},
				},
			],
		});
	};

	const toggleReverse = (event: React.MouseEvent) => {
		event.stopPropagation();
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					updates: { reversed: !isReversed },
				},
			],
		});
	};

	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger>
				<HugeiconsIcon icon={Edit02Icon} className="size-4" />
				{t("Basic Edit")}
			</ContextMenuSubTrigger>
			<ContextMenuSubContent className="w-48">
				<ContextMenuCheckboxItem
					className="px-4"
					checked={isMirrored}
					onClick={toggleMirror}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							toggleMirror(event as unknown as React.MouseEvent);
						}
					}}
				>
					<HugeiconsIcon icon={FlipHorizontalIcon} className="size-4" />
					{t("Mirror")}
				</ContextMenuCheckboxItem>
				<ContextMenuCheckboxItem
					className="px-4"
					checked={isReversed}
					onClick={toggleReverse}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							toggleReverse(event as unknown as React.MouseEvent);
						}
					}}
				>
					<HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-4" />
					{t("Reverse")}
				</ContextMenuCheckboxItem>
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}

function ActionMenuItem({
	action,
	children,
	...props
}: Omit<ComponentProps<typeof ContextMenuItem>, "onClick" | "textRight"> & {
	action: TAction;
}) {
	return (
		<ContextMenuItem
			onClick={(event) => {
				event.stopPropagation();
				invokeAction(action);
			}}
			textRight={getDisplayShortcut(action)}
			{...props}
		>
			{children}
		</ContextMenuItem>
	);
}
