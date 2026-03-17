"use client";

import { useTranslation } from "@i18next-toolkit/nextjs-approuter";
import { useCallback, useState } from "react";
import { PanelBaseView as BaseView } from "@/components/editor/panels/panel-base-view";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getImageProvider, getVideoProvider } from "@/lib/ai/providers";
import {
	useAIImageGenerationStore,
	type AssetStatus,
	type GeneratedImage,
} from "@/stores/ai-image-generation-store";
import {
	useAIVideoGenerationStore,
	type GeneratedVideo,
} from "@/stores/ai-video-generation-store";
import {
	getHistoryImageBlob,
	useAIGenerationHistoryStore,
	type AIGenerationHistoryEntry,
} from "@/stores/ai-generation-history-store";
import { useAISettingsStore } from "@/stores/ai-settings-store";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";
import { cn } from "@/utils/ui";
import {
	ArrowUpRight01Icon,
	Cancel01Icon,
	Delete02Icon,
	Image01Icon,
	ImageAdd01Icon,
	Loading03Icon,
	Settings01Icon,
	Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CharacterPicker } from "@/components/characters/character-picker";
import { CharacterDetailDialog } from "@/components/characters/character-detail";
import { useCharacterStore } from "@/stores/character-store";
import type { AICharacter } from "@/types/character";
import { UserIcon } from "@hugeicons/core-free-icons";
import { Link, useRouter } from "@/lib/navigation";
import { AITemplateCutsView } from "./ai-template-cuts";

const ASPECT_RATIOS = [
	{ value: "auto", label: "Auto" },
	{ value: "1:1", label: "1:1" },
	{ value: "16:9", label: "16:9" },
	{ value: "9:16", label: "9:16" },
	{ value: "4:3", label: "4:3" },
	{ value: "3:4", label: "3:4" },
] as const;

const VIDEO_DURATIONS = [
	{ value: "4", label: "4s" },
	{ value: "5", label: "5s" },
	{ value: "6", label: "6s" },
	{ value: "8", label: "8s" },
	{ value: "10", label: "10s" },
	{ value: "12", label: "12s" },
] as const;

const VIDEO_ASPECT_RATIOS = [
	{ value: "16:9", label: "16:9" },
	{ value: "9:16", label: "9:16" },
	{ value: "1:1", label: "1:1" },
	{ value: "4:3", label: "4:3" },
	{ value: "3:4", label: "3:4" },
	{ value: "21:9", label: "21:9" },
] as const;

const VIDEO_RESOLUTIONS = [
	{ value: "480p", label: "480p" },
	{ value: "720p", label: "720p" },
	{ value: "1080p", label: "1080p" },
] as const;

function ReferenceImagePicker({
	previewUrl,
	disabled,
	onSelect,
	onClear,
	className,
}: {
	previewUrl: string | null;
	disabled: boolean;
	onSelect: (file: File) => void;
	onClear: () => void;
	className?: string;
}) {
	const { t } = useTranslation();

	const handleFileSelect = useCallback(() => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/png,image/jpeg,image/webp,image/gif";
		input.addEventListener("change", () => {
			const file = input.files?.[0];
			if (file) onSelect(file);
		});
		input.click();
	}, [onSelect]);

	if (previewUrl) {
		return (
			<div className={cn("group/ref relative", className)}>
				<button
					type="button"
					className="bg-muted/50 flex w-full items-center gap-2 overflow-hidden rounded-md border p-1.5"
					onClick={handleFileSelect}
					onKeyDown={(event) => {
						if (event.key === "Enter") handleFileSelect();
					}}
					disabled={disabled}
				>
					{/* biome-ignore lint: local blob URL */}
					<img
						src={previewUrl}
						alt={t("Reference image")}
						className="size-10 rounded object-cover"
					/>
					<span className="text-muted-foreground truncate text-xs">
						{t("Reference image")}
					</span>
				</button>
				<button
					type="button"
					className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 opacity-0 transition-opacity hover:bg-black/80 group-hover/ref:opacity-100"
					title={t("Remove reference image")}
					onClick={(event) => {
						event.stopPropagation();
						onClear();
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.stopPropagation();
							onClear();
						}
					}}
				>
					<HugeiconsIcon icon={Cancel01Icon} className="size-3 text-white" />
				</button>
			</div>
		);
	}

	return (
		<button
			type="button"
			className={cn(
				"bg-muted/30 hover:bg-muted/60 flex w-full items-center gap-2 rounded-md border border-dashed p-2 transition-colors",
				className,
			)}
			onClick={handleFileSelect}
			onKeyDown={(event) => {
				if (event.key === "Enter") handleFileSelect();
			}}
			disabled={disabled}
		>
			<HugeiconsIcon icon={Image01Icon} className="text-muted-foreground size-4 shrink-0" />
			<span className="text-muted-foreground truncate text-xs">
				{t("Add reference image (optional)")}
			</span>
		</button>
	);
}

function AIImageView() {
	const { t } = useTranslation();
	const { imageProviderId, imageApiKey } = useAISettingsStore();
	const { setActiveTab } = useAssetsPanelStore();

	const {
		prompt,
		aspectRatio,
		referenceImagePreview,
		selectedCharacterId,
		isGenerating,
		generatedImages,
		setPrompt,
		setAspectRatio,
		setReferenceImage,
		setSelectedCharacterId,
		generate,
	} = useAIImageGenerationStore();

	const provider = imageProviderId
		? getImageProvider({ id: imageProviderId })
		: null;

	const isConfigured = provider !== null && imageApiKey.length > 0;

	if (!isConfigured) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
				<HugeiconsIcon
					icon={Settings01Icon}
					className="text-muted-foreground size-10"
				/>
				<div className="flex flex-col gap-1">
					<p className="text-foreground text-sm font-medium">
						{t("No Image Provider Configured")}
					</p>
					<p className="text-muted-foreground text-xs">
						{t(
							"Select a provider and enter your API key in Settings to get started.",
						)}
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setActiveTab("settings")}
					onKeyDown={(event) => {
						if (event.key === "Enter") setActiveTab("settings");
					}}
				>
					{t("Go to Settings")}
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Textarea
					placeholder={t("Describe the image you want to generate...")}
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					rows={4}
					disabled={isGenerating}
					onKeyDown={(event) => {
						if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
							generate();
						}
					}}
				/>

				<div className="flex items-start gap-2">
					{(selectedCharacterId || !referenceImagePreview) && (
						<CharacterPicker
							selectedCharacterId={selectedCharacterId}
							onSelect={(id) => setSelectedCharacterId(id)}
							disabled={isGenerating}
							className="flex-1 min-w-0"
						/>
					)}

					{!selectedCharacterId && (
						<ReferenceImagePicker
							previewUrl={referenceImagePreview}
							disabled={isGenerating}
							onSelect={(file) => setReferenceImage(file)}
							onClear={() => setReferenceImage(null)}
							className="flex-1 min-w-0"
						/>
					)}
				</div>

				<div className="flex items-center gap-2">
					<Select value={aspectRatio} onValueChange={setAspectRatio}>
						<SelectTrigger className="w-24">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ASPECT_RATIOS.map((ratio) => (
								<SelectItem key={ratio.value} value={ratio.value}>
									{ratio.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button
						type="button"
						className="flex-1"
						disabled={isGenerating || !prompt.trim()}
						onClick={() => generate()}
						onKeyDown={(event) => {
							if (event.key === "Enter") generate();
						}}
					>
						{isGenerating ? (
							<>
								<HugeiconsIcon
									icon={Loading03Icon}
									className="mr-1 size-4 animate-spin"
								/>
								{t("Generating...")}
							</>
						) : (
							<>
								<HugeiconsIcon icon={ImageAdd01Icon} className="mr-1 size-4" />
								{t("Generate")}
							</>
						)}
					</Button>
				</div>
			</div>

			{generatedImages.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs font-medium">
						{t("Generated Images ({{num}})", {
							num: generatedImages.length,
						})}
					</span>
					<div className="grid grid-cols-2 gap-2">
						{generatedImages.map((image) => (
							<GeneratedImageCard key={image.id} image={image} />
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function AssetStatusBadge({
	status,
	onRetry,
}: {
	status: AssetStatus;
	onRetry: () => void;
}) {
	const { t } = useTranslation();

	if (status === "added") {
		return (
			<div
				className="absolute top-1 right-1 rounded-full bg-green-500/90 p-0.5"
				title={t("Added to assets")}
			>
				<svg
					className="size-3 text-white"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<title>Added</title>
					<path d="M5 13l4 4L19 7" />
				</svg>
			</div>
		);
	}

	if (status === "pending" || status === "adding") {
		return (
			<div className="absolute top-1 right-1" title={t("Adding to assets...")}>
				<HugeiconsIcon
					icon={Loading03Icon}
					className="size-4 animate-spin text-white drop-shadow"
				/>
			</div>
		);
	}

	if (status === "failed") {
		return (
			<button
				type="button"
				className="absolute top-1 right-1 cursor-pointer rounded-full bg-red-500/90 p-0.5"
				title={t("Failed to add to assets. Click to retry.")}
				onClick={(event) => {
					event.stopPropagation();
					onRetry();
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.stopPropagation();
						onRetry();
					}
				}}
			>
				<svg
					className="size-3 text-white"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<title>Retry</title>
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
		);
	}

	return null;
}

function OpenInNewWindowButton({ url }: { url: string }) {
	const { t } = useTranslation();

	return (
		<button
			type="button"
			className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
			title={t("Open in new window")}
			onClick={(event) => {
				event.stopPropagation();
				window.open(url, "_blank", "noopener,noreferrer");
			}}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					event.stopPropagation();
					window.open(url, "_blank", "noopener,noreferrer");
				}
			}}
		>
			<HugeiconsIcon
				icon={ArrowUpRight01Icon}
				className="size-3.5 text-white"
			/>
		</button>
	);
}

function GeneratedImageCard({ image }: { image: GeneratedImage }) {
	const [isLoaded, setIsLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);
	const { retryAddToAssets } = useAIImageGenerationStore();

	const handleRetry = useCallback(() => {
		retryAddToAssets(image.id);
	}, [retryAddToAssets, image.id]);

	const showSpinner = !isLoaded && !hasError;

	return (
		<div className="group bg-muted/50 relative overflow-hidden rounded-md border">
			<div className="relative aspect-square w-full overflow-hidden">
				{showSpinner && (
					<div className="bg-muted absolute inset-0 flex items-center justify-center">
						<HugeiconsIcon
							icon={Loading03Icon}
							className="text-muted-foreground size-6 animate-spin"
						/>
					</div>
				)}
				{/* biome-ignore lint: external URL, can't use Next Image */}
				<img
					src={image.url}
					alt="AI generated result"
					className={cn(
						"h-full w-full object-cover transition-opacity",
						isLoaded ? "opacity-100" : "opacity-0",
					)}
					onLoad={() => {
						setIsLoaded(true);
						setHasError(false);
					}}
					onError={() => setHasError(true)}
				/>
				<AssetStatusBadge status={image.assetStatus} onRetry={handleRetry} />
				{isLoaded && <OpenInNewWindowButton url={image.url} />}
			</div>
		</div>
	);
}

function AIVideoView() {
	const { t } = useTranslation();
	const { videoProviderId, videoApiKey } = useAISettingsStore();
	const { setActiveTab } = useAssetsPanelStore();

	const {
		prompt,
		duration,
		aspectRatio: videoAspectRatio,
		resolution,
		referenceImagePreview,
		selectedCharacterId,
		isGenerating,
		generatedVideos,
		setPrompt,
		setDuration,
		setAspectRatio: setVideoAspectRatio,
		setResolution,
		setReferenceImage,
		setSelectedCharacterId,
		generate,
	} = useAIVideoGenerationStore();

	const provider = videoProviderId
		? getVideoProvider({ id: videoProviderId })
		: null;

	const isConfigured = provider !== null && videoApiKey.length > 0;

	if (!isConfigured) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
				<HugeiconsIcon
					icon={Settings01Icon}
					className="text-muted-foreground size-10"
				/>
				<div className="flex flex-col gap-1">
					<p className="text-foreground text-sm font-medium">
						{t("No Video Provider Configured")}
					</p>
					<p className="text-muted-foreground text-xs">
						{t(
							"Select a provider and enter your API key in Settings to get started.",
						)}
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setActiveTab("settings")}
					onKeyDown={(event) => {
						if (event.key === "Enter") setActiveTab("settings");
					}}
				>
					{t("Go to Settings")}
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Textarea
					placeholder={t("Describe the video you want to generate...")}
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					rows={4}
					disabled={isGenerating}
					onKeyDown={(event) => {
						if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
							generate();
						}
					}}
				/>

				<div className="flex items-start gap-2">
					{(selectedCharacterId || !referenceImagePreview) && (
						<CharacterPicker
							selectedCharacterId={selectedCharacterId}
							onSelect={(id) => setSelectedCharacterId(id)}
							disabled={isGenerating}
							className="flex-1 min-w-0"
						/>
					)}

					{!selectedCharacterId && (
						<ReferenceImagePicker
							previewUrl={referenceImagePreview}
							disabled={isGenerating}
							onSelect={(file) => setReferenceImage(file)}
							onClear={() => setReferenceImage(null)}
							className="flex-1 min-w-0"
						/>
					)}
				</div>

				<div className="flex items-center gap-2">
					<Select
						value={String(duration)}
						onValueChange={(value) => setDuration(Number(value))}
					>
						<SelectTrigger className="w-[72px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{VIDEO_DURATIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
						<SelectTrigger className="w-[72px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{VIDEO_ASPECT_RATIOS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={resolution} onValueChange={setResolution}>
						<SelectTrigger className="w-[72px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{VIDEO_RESOLUTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<Button
					type="button"
					disabled={isGenerating || !prompt.trim()}
					onClick={() => generate()}
					onKeyDown={(event) => {
						if (event.key === "Enter") generate();
					}}
				>
					{isGenerating ? (
						<>
							<HugeiconsIcon
								icon={Loading03Icon}
								className="mr-1 size-4 animate-spin"
							/>
							{t("Submitting...")}
						</>
					) : (
						<>
							<HugeiconsIcon icon={Video01Icon} className="mr-1 size-4" />
							{t("Generate Video")}
						</>
					)}
				</Button>
			</div>

			{generatedVideos.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs font-medium">
						{t("Generated Videos ({{num}})", {
							num: generatedVideos.length,
						})}
					</span>
					<div className="flex flex-col gap-2">
						{generatedVideos.map((video) => (
							<GeneratedVideoCard key={video.id} video={video} />
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function VideoStatusBadge({
	video,
	onRetry,
}: {
	video: GeneratedVideo;
	onRetry: () => void;
}) {
	const { t } = useTranslation();

	const isTaskRunning =
		video.taskStatus === "pending" || video.taskStatus === "running";

	if (isTaskRunning) {
		return (
			<div className="flex items-center gap-1.5 text-xs">
				<HugeiconsIcon
					icon={Loading03Icon}
					className="size-3.5 animate-spin text-blue-500"
				/>
				<span className="text-muted-foreground">{t("Generating...")}</span>
			</div>
		);
	}

	if (video.taskStatus === "failed") {
		return (
			<span className="text-xs text-red-500">{video.error ?? t("Failed")}</span>
		);
	}

	if (video.assetStatus === "adding") {
		return (
			<div className="flex items-center gap-1.5 text-xs">
				<HugeiconsIcon
					icon={Loading03Icon}
					className="size-3.5 animate-spin text-blue-500"
				/>
				<span className="text-muted-foreground">
					{t("Adding to assets...")}
				</span>
			</div>
		);
	}

	if (video.assetStatus === "added") {
		return (
			<span className="text-xs text-green-600">{t("Added to assets")}</span>
		);
	}

	if (video.assetStatus === "failed") {
		return (
			<button
				type="button"
				className="cursor-pointer text-xs text-red-500 underline"
				onClick={onRetry}
				onKeyDown={(event) => {
					if (event.key === "Enter") onRetry();
				}}
			>
				{t("Failed to add. Click to retry.")}
			</button>
		);
	}

	return null;
}

function GeneratedVideoCard({ video }: { video: GeneratedVideo }) {
	const { t } = useTranslation();
	const { retryAddToAssets } = useAIVideoGenerationStore();

	const handleRetry = useCallback(() => {
		retryAddToAssets(video.id);
	}, [retryAddToAssets, video.id]);

	const isTaskRunning =
		video.taskStatus === "pending" || video.taskStatus === "running";

	return (
		<div className="bg-muted/50 overflow-hidden rounded-md border p-3">
			<p className="text-foreground mb-2 line-clamp-2 text-xs">
				{video.prompt}
			</p>

			{video.videoUrl && (
				<div className="group/video relative mb-2 overflow-hidden rounded">
					<video
						src={video.videoUrl}
						controls
						className="w-full"
						preload="metadata"
					>
						<track kind="captions" />
					</video>
					<button
						type="button"
						className="absolute top-1 right-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity hover:bg-black/80 group-hover/video:opacity-100"
						title={t("Open in new window")}
						onClick={(event) => {
							event.stopPropagation();
							window.open(video.videoUrl, "_blank", "noopener,noreferrer");
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.stopPropagation();
								window.open(video.videoUrl, "_blank", "noopener,noreferrer");
							}
						}}
					>
						<HugeiconsIcon
							icon={ArrowUpRight01Icon}
							className="size-3.5 text-white"
						/>
					</button>
				</div>
			)}

			{isTaskRunning && !video.videoUrl && (
				<div className="bg-muted mb-2 flex aspect-video items-center justify-center rounded">
					<div className="flex flex-col items-center gap-2">
						<HugeiconsIcon
							icon={Loading03Icon}
							className="text-muted-foreground size-8 animate-spin"
						/>
						<span className="text-muted-foreground text-xs">
							{t("Generating video...")}
						</span>
					</div>
				</div>
			)}

			<VideoStatusBadge video={video} onRetry={handleRetry} />
		</div>
	);
}

function HistoryEntryCard({ entry }: { entry: AIGenerationHistoryEntry }) {
	const { t } = useTranslation();
	const [isLoaded, setIsLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);
	const { removeEntry } = useAIGenerationHistoryStore();

	const displayUrl = entry.thumbnailUrl || entry.url;
	const hasExternalUrl =
		entry.url.length > 0 && !entry.url.startsWith("data:");

	const handleOpenFullImage = useCallback(async () => {
		const blob = await getHistoryImageBlob({ id: entry.id });
		if (blob) {
			const blobUrl = URL.createObjectURL(blob);
			window.open(blobUrl, "_blank", "noopener,noreferrer");
		} else if (hasExternalUrl) {
			window.open(entry.url, "_blank", "noopener,noreferrer");
		}
	}, [entry.id, entry.url, hasExternalUrl]);
	const createdDate = new Date(entry.createdAt);
	const formattedDate = `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

	if (entry.type === "video") {
		return (
			<div className="bg-muted/50 group overflow-hidden rounded-md border p-3">
				<div className="mb-1 flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<HugeiconsIcon
							icon={Video01Icon}
							className="text-muted-foreground size-3.5"
						/>
						<span className="text-muted-foreground text-[10px]">
							{entry.provider}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<span className="text-muted-foreground text-[10px]">
							{formattedDate}
						</span>
						<button
							type="button"
							className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
							title={t("Remove")}
							onClick={() => removeEntry(entry.id)}
							onKeyDown={(event) => {
								if (event.key === "Enter") removeEntry(entry.id);
							}}
						>
							<HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
						</button>
					</div>
				</div>
				<p className="text-foreground mb-2 line-clamp-2 text-xs">
					{entry.prompt}
				</p>
				<div className="group/video relative overflow-hidden rounded">
					<video src={entry.url} controls className="w-full" preload="metadata">
						<track kind="captions" />
					</video>
					<button
						type="button"
						className="absolute top-1 right-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity hover:bg-black/80 group-hover/video:opacity-100"
						title={t("Open in new window")}
						onClick={(event) => {
							event.stopPropagation();
							window.open(entry.url, "_blank", "noopener,noreferrer");
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.stopPropagation();
								window.open(entry.url, "_blank", "noopener,noreferrer");
							}
						}}
					>
						<HugeiconsIcon
							icon={ArrowUpRight01Icon}
							className="size-3.5 text-white"
						/>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-muted/50 group relative overflow-hidden rounded-md border">
			<div className="relative aspect-square w-full overflow-hidden">
				{!isLoaded && !hasError && (
					<div className="bg-muted absolute inset-0 flex items-center justify-center">
						<HugeiconsIcon
							icon={Loading03Icon}
							className="text-muted-foreground size-6 animate-spin"
						/>
					</div>
				)}
				{hasError && (
					<div className="bg-muted absolute inset-0 flex items-center justify-center">
						<HugeiconsIcon
							icon={ImageAdd01Icon}
							className="text-muted-foreground size-6"
						/>
					</div>
				)}
				{/* biome-ignore lint: external URL, can't use Next Image */}
				<img
					src={displayUrl}
					alt={entry.prompt}
					className={cn(
						"h-full w-full object-cover transition-opacity",
						isLoaded ? "opacity-100" : "opacity-0",
					)}
					onLoad={() => {
						setIsLoaded(true);
						setHasError(false);
					}}
					onError={() => setHasError(true)}
				/>
				<button
					type="button"
					className="absolute top-1 right-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
					title={t("Remove")}
					onClick={(event) => {
						event.stopPropagation();
						removeEntry(entry.id);
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.stopPropagation();
							removeEntry(entry.id);
						}
					}}
				>
					<HugeiconsIcon icon={Delete02Icon} className="size-4 drop-shadow" />
				</button>
				{isLoaded && (
					<button
						type="button"
						className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
						title={t("Open in new window")}
						onClick={(event) => {
							event.stopPropagation();
							void handleOpenFullImage();
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.stopPropagation();
								void handleOpenFullImage();
							}
						}}
					>
						<HugeiconsIcon
							icon={ArrowUpRight01Icon}
							className="size-3.5 text-white"
						/>
					</button>
				)}
			</div>
			<div className="p-1.5">
				<p className="text-foreground line-clamp-1 text-[10px]">
					{entry.prompt}
				</p>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground text-[10px]">
						{entry.provider}
					</span>
					<span className="text-muted-foreground text-[10px]">
						{formattedDate}
					</span>
				</div>
			</div>
		</div>
	);
}

function AIHistoryView() {
	const { t } = useTranslation();
	const { entries, clearHistory } = useAIGenerationHistoryStore();

	if (entries.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
				<p className="text-muted-foreground text-sm">
					{t("No generation history yet")}
				</p>
				<p className="text-muted-foreground text-xs">
					{t("Your AI image and video generation results will appear here.")}
				</p>
			</div>
		);
	}

	const imageEntries = entries.filter((entry) => entry.type === "image");
	const videoEntries = entries.filter((entry) => entry.type === "video");

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<span className="text-muted-foreground text-xs font-medium">
					{t("{{num}} items", { num: entries.length })}
				</span>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="text-muted-foreground h-auto px-2 py-1 text-xs"
					onClick={clearHistory}
					onKeyDown={(event) => {
						if (event.key === "Enter") clearHistory();
					}}
				>
					{t("Clear All")}
				</Button>
			</div>

			{imageEntries.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs font-medium">
						{t("Images ({{num}})", { num: imageEntries.length })}
					</span>
					<div className="grid grid-cols-2 gap-2">
						{imageEntries.map((entry) => (
							<HistoryEntryCard key={entry.id} entry={entry} />
						))}
					</div>
				</div>
			)}

			{videoEntries.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs font-medium">
						{t("Videos ({{num}})", { num: videoEntries.length })}
					</span>
					<div className="flex flex-col gap-2">
						{videoEntries.map((entry) => (
							<HistoryEntryCard key={entry.id} entry={entry} />
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function AICharactersView() {
	const { t } = useTranslation();
	const router = useRouter();
	const { characters } = useCharacterStore();
	const [viewingCharacter, setViewingCharacter] =
		useState<AICharacter | null>(null);

	return (
		<>
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground text-xs font-medium">
						{t("{{num}} characters", { num: characters.length })}
					</span>
				<Link href="/characters">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="text-muted-foreground h-auto px-2 py-1 text-xs"
					>
						{t("Manage")}
					</Button>
				</Link>
				</div>

				{characters.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
						<HugeiconsIcon
							icon={UserIcon}
							className="text-muted-foreground size-10"
						/>
						<p className="text-muted-foreground text-sm">
							{t("No characters yet")}
						</p>
						<p className="text-muted-foreground text-xs">
							{t("Create characters in the character library to use as reference images.")}
						</p>
					<Link href="/characters">
						<Button type="button" variant="outline" size="sm">
							{t("Go to Character Library")}
						</Button>
					</Link>
					</div>
				) : (
					<div className="flex flex-col gap-2">
						{characters.map((character) => (
							<button
								key={character.id}
								type="button"
								className="bg-muted/50 hover:bg-muted/80 flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors"
								onClick={() => setViewingCharacter(character)}
								onKeyDown={(event) => {
									if (event.key === "Enter")
										setViewingCharacter(character);
								}}
							>
								{character.thumbnailDataUrl ? (
									/* biome-ignore lint: data URL thumbnail */
									<img
										src={character.thumbnailDataUrl}
										alt={character.name}
										className="size-12 shrink-0 rounded-md object-cover"
									/>
								) : (
									<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md">
										<HugeiconsIcon
											icon={UserIcon}
											className="text-muted-foreground size-5"
										/>
									</div>
								)}
								<div className="flex min-w-0 flex-col gap-0.5">
									<span className="text-foreground truncate text-xs font-medium">
										{character.name}
									</span>
									{character.description && (
										<p className="text-muted-foreground line-clamp-2 text-[10px]">
											{character.description}
										</p>
									)}
									<span className="text-muted-foreground text-[10px]">
										{t("{{num}} images", { num: character.images.length })}
									</span>
								</div>
							</button>
						))}
					</div>
				)}
			</div>

			<CharacterDetailDialog
				character={viewingCharacter}
				isOpen={viewingCharacter !== null}
				onOpenChange={(open) => {
					if (!open) setViewingCharacter(null);
				}}
				onEdit={() => {
					setViewingCharacter(null);
					router.push("/characters");
				}}
			/>
		</>
	);
}

function AIGenerateView() {
	const { t } = useTranslation();

	return (
		<Tabs defaultValue="image" className="-mt-2 flex h-full flex-col">
			<TabsList className="mb-3 justify-start">
				<TabsTrigger value="image">{t("Image")}</TabsTrigger>
				<TabsTrigger value="video">{t("Video")}</TabsTrigger>
			</TabsList>
			<TabsContent
				value="image"
				className="mt-0 flex min-h-0 flex-1 flex-col"
			>
				<AIImageView />
			</TabsContent>
			<TabsContent
				value="video"
				className="mt-0 flex min-h-0 flex-1 flex-col"
			>
				<AIVideoView />
			</TabsContent>
		</Tabs>
	);
}

export function AIView() {
	const { t } = useTranslation();

	return (
		<BaseView
			defaultTab="generate"
			tabs={[
				{
					value: "generate",
					label: t("Generate"),
					content: <AIGenerateView />,
				},
				{
					value: "template-cuts",
					label: t("Presets"),
					content: <AITemplateCutsView />,
				},
				{
					value: "ai-characters",
					label: t("Characters"),
					content: <AICharactersView />,
				},
				{
					value: "ai-history",
					label: t("History"),
					content: <AIHistoryView />,
				},
			]}
			className="flex h-full flex-col"
		/>
	);
}
