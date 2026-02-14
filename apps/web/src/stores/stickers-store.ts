import { create } from "zustand";
import {
	getCollections,
	getCollection,
	searchIcons,
	type IconSet,
	type CollectionInfo,
	type IconSearchResult,
} from "@/lib/iconify-api";
import { EditorCore } from "@/core";
import { buildStickerElement } from "@/lib/timeline/element-utils";
import { STICKER_CATEGORY_CONFIG } from "@/constants/stickers-constants";
import type { StickerCategory } from "@/types/stickers";

type ViewMode = "search" | "browse" | "collection";

interface StickersStore {
	searchQuery: string;
	selectedCategory: StickerCategory;
	selectedCollection: string | null;
	viewMode: ViewMode;
	collections: Record<string, IconSet>;
	currentCollection: CollectionInfo | null;
	searchResults: IconSearchResult | null;
	recentStickers: string[];
	isLoadingCollections: boolean;
	isLoadingCollection: boolean;
	isSearching: boolean;
	addingSticker: string | null;

	setSearchQuery: ({ query }: { query: string }) => void;
	setSelectedCategory: ({ category }: { category: StickerCategory }) => void;
	setSelectedCollection: ({
		collection,
	}: {
		collection: string | null;
	}) => void;
	setViewMode: ({ mode }: { mode: ViewMode }) => void;
	loadCollections: () => Promise<void>;
	loadCollection: ({ prefix }: { prefix: string }) => Promise<void>;
	searchStickers: ({ query }: { query: string }) => Promise<void>;
	addStickerToTimeline: ({ iconName }: { iconName: string }) => void;
	addToRecentStickers: ({ iconName }: { iconName: string }) => void;
	clearRecentStickers: () => void;
}

const MAX_RECENT_STICKERS = 50;

export const useStickersStore = create<StickersStore>((set, get) => ({
	searchQuery: "",
	selectedCategory: "all",
	selectedCollection: null,
	viewMode: "browse",

	collections: {},
	currentCollection: null,
	searchResults: null,
	recentStickers: [],

	isLoadingCollections: false,
	isLoadingCollection: false,
	isSearching: false,
	addingSticker: null,

	setSearchQuery: ({ query }) => set({ searchQuery: query }),

	setSelectedCategory: ({ category }) =>
		set({
			selectedCategory: category,
			viewMode: "browse",
			selectedCollection: null,
			currentCollection: null,
		}),

	setSelectedCollection: ({ collection }) => {
		set({
			selectedCollection: collection,
			viewMode: collection ? "collection" : "browse",
			currentCollection: null,
		});

		if (collection) {
			get().loadCollection({ prefix: collection });
		}
	},

	setViewMode: ({ mode }) => set({ viewMode: mode }),

	loadCollections: async () => {
		set({ isLoadingCollections: true });
		try {
			const collections = await getCollections();
			set({ collections });
		} catch (error) {
			console.error("Failed to load collections:", error);
		} finally {
			set({ isLoadingCollections: false });
		}
	},

	loadCollection: async ({ prefix }: { prefix: string }) => {
		set({ isLoadingCollection: true });
		try {
			const collection = await getCollection(prefix);
			set({ currentCollection: collection });
		} catch (error) {
			console.error(`Failed to load collection ${prefix}:`, error);
			set({ currentCollection: null });
		} finally {
			set({ isLoadingCollection: false });
		}
	},

	searchStickers: async ({ query }: { query: string }) => {
		if (!query.trim()) {
			set({ searchResults: null, viewMode: "browse" });
			return;
		}

		const { selectedCategory } = get();

		set({ isSearching: true, viewMode: "search" });
		try {
			const category = STICKER_CATEGORY_CONFIG[selectedCategory];
			const results = await searchIcons(query, 100, undefined, category);
			set({ searchResults: results });
		} catch (error) {
			console.error("Search failed:", error);
			set({ searchResults: null });
		} finally {
			set({ isSearching: false });
		}
	},

	addStickerToTimeline: ({ iconName }: { iconName: string }) => {
		set({ addingSticker: iconName });
		try {
			const editor = EditorCore.getInstance();
			const currentTime = editor.playback.getCurrentTime();
			const tracks = editor.timeline.getTracks();

			const stickerTrack = tracks.find((t) => t.type === "sticker");
			let trackId: string;

			if (stickerTrack) {
				trackId = stickerTrack.id;
			} else {
				trackId = editor.timeline.addTrack({ type: "sticker" });
			}

			const element = buildStickerElement({ iconName, startTime: currentTime });
			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId },
				element,
			});

			get().addToRecentStickers({ iconName });
		} finally {
			set({ addingSticker: null });
		}
	},

	addToRecentStickers: ({ iconName }: { iconName: string }) => {
		set((state) => {
			const recent = [
				iconName,
				...state.recentStickers.filter((s) => s !== iconName),
			];
			return {
				recentStickers: recent.slice(0, MAX_RECENT_STICKERS),
			};
		});
	},

	clearRecentStickers: () => set({ recentStickers: [] }),
}));
