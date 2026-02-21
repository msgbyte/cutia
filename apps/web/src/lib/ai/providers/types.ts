export interface ImageGenerationRequest {
	prompt: string;
	aspectRatio?: string;
}

export interface ImageGenerationResult {
	url: string;
}

export interface AIImageProvider {
	id: string;
	name: string;
	description: string;
	useProxy?: boolean;
	generateImage(params: {
		request: ImageGenerationRequest;
		apiKey: string;
	}): Promise<ImageGenerationResult[]>;
}

export interface AIVideoProvider {
	id: string;
	name: string;
	description: string;
}
