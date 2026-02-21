"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PanelBaseView as BaseView } from "@/components/editor/panels/panel-base-view";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getImageProvider } from "@/lib/ai/providers";
import type { ImageGenerationResult } from "@/lib/ai/providers";
import { useAISettingsStore } from "@/stores/ai-settings-store";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";
import { cn } from "@/utils/ui";
import {
	ImageAdd01Icon,
	Loading03Icon,
	Settings01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const ASPECT_RATIOS = [
	{ value: "auto", label: "Auto" },
	{ value: "1:1", label: "1:1" },
	{ value: "16:9", label: "16:9" },
	{ value: "9:16", label: "9:16" },
	{ value: "4:3", label: "4:3" },
	{ value: "3:4", label: "3:4" },
] as const;

function AIImageView() {
	const { imageProviderId, imageApiKey } = useAISettingsStore();
	const { setActiveTab } = useAssetsPanelStore();

	const [prompt, setPrompt] = useState("");
	const [aspectRatio, setAspectRatio] = useState("auto");
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedImages, setGeneratedImages] = useState<
		ImageGenerationResult[]
	>([]);

	const provider =
		imageProviderId ? getImageProvider({ id: imageProviderId }) : null;

	const isConfigured = provider !== null && imageApiKey.length > 0;

	const handleGenerate = useCallback(async () => {
		if (!provider || !imageApiKey) {
			toast.error("Please configure an image provider in Settings");
			return;
		}

		const trimmedPrompt = prompt.trim();
		if (!trimmedPrompt) {
			toast.error("Please enter a prompt");
			return;
		}

		setIsGenerating(true);
		try {
			const results = await provider.generateImage({
				request: {
					prompt: trimmedPrompt,
					aspectRatio: aspectRatio === "auto" ? undefined : aspectRatio,
				},
				apiKey: imageApiKey,
			});

			setGeneratedImages((previous) => [...results, ...previous]);
			toast.success(`Generated ${results.length} image(s)`);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Image generation failed";
			toast.error(message);
		} finally {
			setIsGenerating(false);
		}
	}, [provider, imageApiKey, prompt, aspectRatio]);

	if (!isConfigured) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
				<HugeiconsIcon
					icon={Settings01Icon}
					className="text-muted-foreground size-10"
				/>
				<div className="flex flex-col gap-1">
					<p className="text-foreground text-sm font-medium">
						No Image Provider Configured
					</p>
					<p className="text-muted-foreground text-xs">
						Select a provider and enter your API key in Settings to get started.
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
					Go to Settings
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Textarea
					placeholder="Describe the image you want to generate..."
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					rows={4}
					disabled={isGenerating}
					onKeyDown={(event) => {
						if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
							handleGenerate();
						}
					}}
				/>

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
						onClick={handleGenerate}
						onKeyDown={(event) => {
							if (event.key === "Enter") handleGenerate();
						}}
					>
						{isGenerating ? (
							<>
								<HugeiconsIcon
									icon={Loading03Icon}
									className="mr-1 size-4 animate-spin"
								/>
								Generating...
							</>
						) : (
							<>
								<HugeiconsIcon icon={ImageAdd01Icon} className="mr-1 size-4" />
								Generate
							</>
						)}
					</Button>
				</div>
			</div>

			{generatedImages.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs font-medium">
						Generated Images ({generatedImages.length})
					</span>
					<div className="grid grid-cols-2 gap-2">
						{generatedImages.map((image, index) => (
							<GeneratedImageCard
								key={`${image.url}-${index}`}
								image={image}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function GeneratedImageCard({ image }: { image: ImageGenerationResult }) {
	const [isLoaded, setIsLoaded] = useState(false);

	const handleDownload = useCallback(async () => {
		try {
			const response = await fetch(image.url);
			const blob = await response.blob();
			const blobUrl = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = blobUrl;
			anchor.download = `generated-${Date.now()}.png`;
			anchor.click();
			URL.revokeObjectURL(blobUrl);
		} catch {
			toast.error("Failed to download image");
		}
	}, [image.url]);

	return (
		<div className="group bg-muted/50 relative overflow-hidden rounded-md border">
			<button
				type="button"
				className={cn(
					"relative aspect-square w-full cursor-pointer overflow-hidden",
				)}
				onClick={handleDownload}
			>
				{!isLoaded && (
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
					onLoad={() => setIsLoaded(true)}
				/>
			</button>
		</div>
	);
}

export function AIView() {
	return (
		<BaseView
			defaultTab="ai-image"
			tabs={[
				{
					value: "ai-image",
					label: "AI Image",
					content: <AIImageView />,
				},
				{
					value: "ai-video",
					label: "AI Video",
					content: (
						<div className="text-muted-foreground text-sm">
							AI video generation coming soon...
						</div>
					),
				},
			]}
			className="flex h-full flex-col"
		/>
	);
}
