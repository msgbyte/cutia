export type {
	AIImageProvider,
	AIVideoProvider,
	ImageGenerationRequest,
	ImageGenerationResult,
} from "./types";
export { IMAGE_PROVIDERS } from "./image-providers";
export { VIDEO_PROVIDERS } from "./video-providers";

import { IMAGE_PROVIDERS } from "./image-providers";

export function getImageProvider({
	id,
}: {
	id: string;
}) {
	return IMAGE_PROVIDERS.find((provider) => provider.id === id) ?? null;
}
