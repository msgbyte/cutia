import { create } from "zustand";
import { toast } from "sonner";
import { EditorCore } from "@/core";
import { getImageProvider } from "@/lib/ai/providers";
import { processMediaAssets } from "@/lib/media/processing";
import { useAISettingsStore } from "./ai-settings-store";
import { generateUUID } from "@/utils/id";

export type AssetStatus = "pending" | "adding" | "added" | "failed";

export interface GeneratedImage {
	id: string;
	url: string;
	prompt: string;
	assetStatus: AssetStatus;
}

interface AIImageGenerationState {
	prompt: string;
	aspectRatio: string;
	isGenerating: boolean;
	generatedImages: GeneratedImage[];

	setPrompt: (prompt: string) => void;
	setAspectRatio: (aspectRatio: string) => void;
	generate: () => Promise<void>;
	retryAddToAssets: (imageId: string) => void;
	clearImages: () => void;
}

const pendingBlobs = new Map<string, Blob>();

function updateImageStatus({
	imageId,
	status,
}: {
	imageId: string;
	status: AssetStatus;
}): void {
	useAIImageGenerationStore.setState((state) => ({
		generatedImages: state.generatedImages.map((image) =>
			image.id === imageId ? { ...image, assetStatus: status } : image,
		),
	}));
}

function dataUrlToBlob({ url }: { url: string }): Blob {
	const [header, base64Data] = url.split(",");
	const mimeType = header.match(/:(.*?);/)?.[1] || "image/png";
	const binaryString = atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let index = 0; index < binaryString.length; index++) {
		bytes[index] = binaryString.charCodeAt(index);
	}
	return new Blob([bytes], { type: mimeType });
}

function externalUrlToBlob({ url }: { url: string }): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.addEventListener("load", () => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = image.naturalWidth;
				canvas.height = image.naturalHeight;
				const context = canvas.getContext("2d");
				if (!context) {
					image.remove();
					reject(new Error("Could not get canvas context"));
					return;
				}
				context.drawImage(image, 0, 0);
				canvas.toBlob(
					(blob) => {
						image.remove();
						if (blob) {
							resolve(blob);
						} else {
							reject(
								new Error("Failed to convert image to blob"),
							);
						}
					},
					"image/png",
				);
			} catch (error) {
				image.remove();
				reject(
					error instanceof Error
						? error
						: new Error("Failed to process image"),
				);
			}
		});
		image.addEventListener("error", () => {
			image.remove();
			reject(new Error("Failed to load image"));
		});
		image.src = url;
	});
}

function loadImageAsBlob({ url }: { url: string }): Promise<Blob> {
	if (url.startsWith("data:")) {
		return Promise.resolve(dataUrlToBlob({ url }));
	}
	return externalUrlToBlob({ url });
}

async function convertAndAddToAssets({
	imageId,
	imageUrl,
}: {
	imageId: string;
	imageUrl: string;
}): Promise<void> {
	const editor = EditorCore.getInstance();
	const project = editor.project.getActiveOrNull();
	if (!project) {
		updateImageStatus({ imageId, status: "failed" });
		return;
	}

	updateImageStatus({ imageId, status: "adding" });

	try {
		const blob = await loadImageAsBlob({ url: imageUrl });
		pendingBlobs.set(imageId, blob);

		const blobUrl = URL.createObjectURL(blob);
		useAIImageGenerationStore.setState((state) => ({
			generatedImages: state.generatedImages.map((image) =>
				image.id === imageId ? { ...image, url: blobUrl } : image,
			),
		}));

		const filename = `ai-generated-${imageId.slice(0, 8)}.png`;
		const file = new File([blob], filename, {
			type: blob.type || "image/png",
		});

		const processedAssets = await processMediaAssets({ files: [file] });

		await Promise.all(
			processedAssets.map((asset) =>
				editor.media.addMediaAsset({
					projectId: project.metadata.id,
					asset,
				}),
			),
		);

		updateImageStatus({ imageId, status: "added" });
		pendingBlobs.delete(imageId);
	} catch (error) {
		console.error("Failed to add AI image to assets:", error);
		updateImageStatus({ imageId, status: "failed" });
	}
}

export const useAIImageGenerationStore = create<AIImageGenerationState>()(
	(set, get) => ({
		prompt: "",
		aspectRatio: "auto",
		isGenerating: false,
		generatedImages: [],

		setPrompt: (prompt) => set({ prompt }),
		setAspectRatio: (aspectRatio) => set({ aspectRatio }),

		generate: async () => {
			if (get().isGenerating) return;

			const { imageProviderId, imageApiKey } =
				useAISettingsStore.getState();

			if (!imageProviderId) {
				toast.error("Please configure an image provider in Settings");
				return;
			}

			const provider = getImageProvider({ id: imageProviderId });
			if (!provider || !imageApiKey) {
				toast.error("Please configure an image provider in Settings");
				return;
			}

			const { prompt, aspectRatio } = get();
			const trimmedPrompt = prompt.trim();
			if (!trimmedPrompt) {
				toast.error("Please enter a prompt");
				return;
			}

			set({ isGenerating: true });

			try {
				const results = await provider.generateImage({
					request: {
						prompt: trimmedPrompt,
						aspectRatio:
							aspectRatio === "auto" ? undefined : aspectRatio,
					},
					apiKey: imageApiKey,
				});

				const newImages: GeneratedImage[] = results.map((result) => ({
					id: generateUUID(),
					url: result.url,
					prompt: trimmedPrompt,
					assetStatus: "pending" as const,
				}));

				set((state) => ({
					generatedImages: [...newImages, ...state.generatedImages],
					isGenerating: false,
				}));

				toast.success(`Generated ${results.length} image(s)`);

				for (const image of newImages) {
					void convertAndAddToAssets({
						imageId: image.id,
						imageUrl: image.url,
					});
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Image generation failed";
				toast.error(message);
				set({ isGenerating: false });
			}
		},

		retryAddToAssets: (imageId) => {
			const image = get().generatedImages.find(
				(img) => img.id === imageId,
			);
			if (image) {
				void convertAndAddToAssets({
					imageId: image.id,
					imageUrl: image.url,
				});
			}
		},

		clearImages: () => {
			pendingBlobs.clear();
			set({ generatedImages: [] });
		},
	}),
);
