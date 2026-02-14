"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelBaseView as BaseView } from "@/components/editor/panels/panel-base-view";
import { Button } from "@/components/ui/button";
import { InputWithBack } from "@/components/ui/input-with-back";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { STICKER_CATEGORIES } from "@/constants/stickers-constants";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import {
	buildIconSvgUrl,
	getIconSvgUrl,
	ICONIFY_HOSTS,
	POPULAR_COLLECTIONS,
} from "@/lib/iconify-api";
import { useStickersStore } from "@/stores/stickers-store";
import type { StickerCategory } from "@/types/stickers";
import { cn } from "@/utils/ui";
import {
	ArrowRightIcon,
	HappyIcon,
	ClockIcon,
	LayoutGridIcon,
	MultiplicationSignIcon,
	SparklesIcon,
	HashtagIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Spinner } from "@/components/ui/spinner";

function isStickerCategory(value: string): value is StickerCategory {
	return STICKER_CATEGORIES.includes(value as StickerCategory);
}

export function StickersView() {
	const { selectedCategory, setSelectedCategory } = useStickersStore();

	return (
		<BaseView
			value={selectedCategory}
			onValueChange={(v) => {
				if (isStickerCategory(v)) {
					setSelectedCategory({ category: v });
				}
			}}
			tabs={[
				{
					value: "all",
					label: "All",
					icon: <HugeiconsIcon icon={LayoutGridIcon} className="size-3" />,
					content: <StickersContentView category="all" />,
				},
				{
					value: "general",
					label: "Icons",
					icon: <HugeiconsIcon icon={SparklesIcon} className="size-3" />,
					content: <StickersContentView category="general" />,
				},
				{
					value: "brands",
					label: "Brands",
					icon: <HugeiconsIcon icon={HashtagIcon} className="size-3" />,
					content: <StickersContentView category="brands" />,
				},
				{
					value: "emoji",
					label: "Emoji",
					icon: <HugeiconsIcon icon={HappyIcon} className="size-3" />,
					content: <StickersContentView category="emoji" />,
				},
			]}
			className="flex h-full flex-col overflow-hidden p-0"
		/>
	);
}

function StickerGrid({
	icons,
	onAdd,
	addingSticker,
	capSize = false,
}: {
	icons: string[];
	onAdd: (iconName: string) => void;
	addingSticker: string | null;
	capSize?: boolean;
}) {
	const gridStyle: CSSProperties & {
		"--sticker-min": string;
		"--sticker-max"?: string;
	} = {
		gridTemplateColumns: capSize
			? "repeat(auto-fill, minmax(var(--sticker-min, 96px), var(--sticker-max, 160px)))"
			: "repeat(auto-fit, minmax(var(--sticker-min, 96px), 1fr))",
		"--sticker-min": "96px",
		...(capSize ? { "--sticker-max": "160px" } : {}),
	};

	return (
		<div className="grid gap-2" style={gridStyle}>
			{icons.map((iconName) => (
				<StickerItem
					key={iconName}
					iconName={iconName}
					onAdd={onAdd}
					isAdding={addingSticker === iconName}
					capSize={capSize}
				/>
			))}
		</div>
	);
}

function CollectionGrid({
	collections,
	onSelectCollection,
}: {
	collections: Array<{
		prefix: string;
		name: string;
		total: number;
		category?: string;
	}>;
	onSelectCollection: ({ prefix }: { prefix: string }) => void;
}) {
	return (
		<div className="grid grid-cols-1 gap-2">
			{collections.map((collection) => (
				<CollectionItem
					key={collection.prefix}
					title={collection.name}
					subtitle={`${collection.total.toLocaleString()} icons${collection.category ? ` • ${collection.category}` : ""}`}
					onClick={() => onSelectCollection({ prefix: collection.prefix })}
				/>
			))}
		</div>
	);
}

function EmptyView({ message }: { message: string }) {
	return (
		<div className="bg-background flex h-full flex-col items-center justify-center gap-3 p-4">
			<HugeiconsIcon
				icon={HappyIcon}
				className="text-muted-foreground size-10"
			/>
			<div className="flex flex-col gap-2 text-center">
				<p className="text-lg font-medium">No stickers found</p>
				<p className="text-muted-foreground text-sm text-balance">{message}</p>
			</div>
		</div>
	);
}

function StickersContentView({ category }: { category: StickerCategory }) {
	const {
		searchQuery,
		selectedCollection,
		viewMode,
		collections,
		currentCollection,
		searchResults,
		recentStickers,
		isLoadingCollections,
		isLoadingCollection,
		isSearching,
		setSearchQuery,
		setSelectedCollection,
		loadCollections,
		searchStickers,
		addStickerToTimeline,
		clearRecentStickers,
		setSelectedCategory,
		addingSticker,
	} = useStickersStore();

	const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
	const [collectionsToShow, setCollectionsToShow] = useState(20);
	const [showCollectionItems, setShowCollectionItems] = useState(false);

	const filteredCollections = useMemo(() => {
		if (category === "all") {
			return Object.entries(collections).map(([prefix, collection]) => ({
				prefix,
				name: collection.name,
				total: collection.total,
				category: collection.category,
			}));
		}

		const collectionList =
			POPULAR_COLLECTIONS[category as keyof typeof POPULAR_COLLECTIONS];
		if (!collectionList) return [];

		return collectionList
			.map((c) => {
				const collection = collections[c.prefix];
				return collection
					? {
							prefix: c.prefix,
							name: c.name,
							total: collection.total,
						}
					: null;
			})
			.filter(Boolean) as Array<{
			prefix: string;
			name: string;
			total: number;
		}>;
	}, [collections, category]);

	const { scrollAreaRef, handleScroll } = useInfiniteScroll({
		onLoadMore: () => setCollectionsToShow((prev) => prev + 20),
		hasMore: filteredCollections.length > collectionsToShow,
		isLoading: isLoadingCollections,
		enabled: viewMode === "browse" && !selectedCollection && category === "all",
	});

	useEffect(() => {
		if (Object.keys(collections).length === 0) {
			loadCollections();
		}
	}, [collections, loadCollections]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (localSearchQuery !== searchQuery) {
				setSearchQuery({ query: localSearchQuery });
				if (localSearchQuery.trim()) {
					searchStickers({ query: localSearchQuery });
				}
			}
		}, 500);

		return () => clearTimeout(timer);
	}, [localSearchQuery, searchQuery, searchStickers, setSearchQuery]);

	const handleAddSticker = async (iconName: string) => {
		try {
			await addStickerToTimeline({ iconName });
		} catch (error) {
			console.error("Failed to add sticker:", error);
			toast.error("Failed to add sticker to timeline");
		}
	};

	const iconsToDisplay = useMemo(() => {
		if (viewMode === "search" && searchResults) {
			return searchResults.icons;
		}

		if (viewMode === "collection" && currentCollection) {
			const icons: string[] = [];

			if (currentCollection.uncategorized) {
				icons.push(
					...currentCollection.uncategorized.map(
						(name) => `${currentCollection.prefix}:${name}`,
					),
				);
			}

			if (currentCollection.categories) {
				Object.values(currentCollection.categories).forEach((categoryIcons) => {
					icons.push(
						...categoryIcons.map(
							(name) => `${currentCollection.prefix}:${name}`,
						),
					);
				});
			}

			return icons.slice(0, 100);
		}

		return [];
	}, [viewMode, searchResults, currentCollection]);

	const isInCollection = viewMode === "collection" && !!selectedCollection;

	useEffect(() => {
		if (isInCollection) {
			setShowCollectionItems(false);
			const timer = setTimeout(() => setShowCollectionItems(true), 350);
			return () => clearTimeout(timer);
		} else {
			setShowCollectionItems(false);
		}
	}, [isInCollection]);

	return (
		<div className="mt-1 flex h-full flex-col gap-5 p-4">
			<div className="space-y-3">
				<InputWithBack
					isExpanded={isInCollection}
					setIsExpanded={(expanded) => {
						if (!expanded && isInCollection) {
							setSelectedCollection({ collection: null });
						}
					}}
					placeholder={
						category === "all"
							? "Search all stickers"
							: category === "general"
								? "Search icons"
								: category === "brands"
									? "Search brands"
									: "Search Emojis"
					}
					value={localSearchQuery}
					onChange={setLocalSearchQuery}
					disableAnimation={true}
				/>
			</div>

			<div className="relative h-full overflow-hidden">
				<ScrollArea
					className="h-full flex-1"
					ref={scrollAreaRef}
					onScrollCapture={handleScroll}
				>
					<div className="flex h-full flex-col gap-4">
						{recentStickers.length > 0 && viewMode === "browse" && (
							<div className="h-full">
								<div className="mb-2 flex items-center gap-2">
									<HugeiconsIcon
										icon={ClockIcon}
										className="text-muted-foreground size-4"
									/>
									<span className="text-sm font-medium">Recent</span>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													type="button"
													onClick={clearRecentStickers}
													className="hover:bg-accent ml-auto flex size-5 items-center justify-center rounded p-0"
												>
													<HugeiconsIcon
														icon={MultiplicationSignIcon}
														className="text-muted-foreground size-3"
													/>
												</button>
											</TooltipTrigger>
											<TooltipContent>
												<p>Clear recent stickers</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
								<StickerGrid
									icons={recentStickers.slice(0, 12)}
									onAdd={handleAddSticker}
									addingSticker={addingSticker}
									capSize
								/>
							</div>
						)}

						{viewMode === "collection" && selectedCollection && (
							<div className="h-full">
								{isLoadingCollection ? (
									<div className="flex items-center justify-center py-8">
										<Spinner className="text-muted-foreground size-6" />
									</div>
								) : showCollectionItems ? (
									<StickerGrid
										icons={iconsToDisplay}
										onAdd={handleAddSticker}
										addingSticker={addingSticker}
									/>
								) : (
									<div className="flex items-center justify-center py-8">
										<Spinner className="text-muted-foreground size-6" />
									</div>
								)}
							</div>
						)}

						{viewMode === "search" && (
							<div className="h-full">
								{isSearching ? (
									<div className="flex items-center justify-center py-8">
										<Spinner className="text-muted-foreground size-6" />
									</div>
								) : searchResults?.icons.length ? (
									<>
										<div className="mb-3 flex items-center justify-between">
											<span className="text-muted-foreground text-sm">
												{searchResults.total} results
											</span>
										</div>
										<StickerGrid
											icons={iconsToDisplay}
											onAdd={handleAddSticker}
											addingSticker={addingSticker}
											capSize
										/>
									</>
								) : searchQuery ? (
									<div className="flex flex-col items-center justify-center gap-3 py-8">
										<EmptyView
											message={`No stickers found for "${searchQuery}"`}
										/>
										{category !== "all" && (
											<Button
												variant="outline"
												onClick={() => {
													const q = localSearchQuery || searchQuery;
													if (q) {
														setSearchQuery({ query: q });
													}
													setSelectedCategory({ category: "all" });
													if (q) {
														searchStickers({ query: q });
													}
												}}
											>
												Search in all icons
											</Button>
										)}
									</div>
								) : null}
							</div>
						)}

						{viewMode === "browse" && !selectedCollection && (
							<div className="h-full space-y-4">
								{isLoadingCollections ? (
									<div className="flex items-center justify-center py-8">
										<Spinner className="text-muted-foreground size-6" />
									</div>
								) : (
									<>
										{category !== "all" && (
											<div className="h-full">
												<CollectionGrid
													collections={filteredCollections}
													onSelectCollection={({ prefix }) =>
														setSelectedCollection({ collection: prefix })
													}
												/>
											</div>
										)}

										{category === "all" && filteredCollections.length > 0 && (
											<div className="h-full">
												<CollectionGrid
													collections={filteredCollections.slice(
														0,
														collectionsToShow,
													)}
													onSelectCollection={({ prefix }) =>
														setSelectedCollection({ collection: prefix })
													}
												/>
											</div>
										)}
									</>
								)}
							</div>
						)}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}

interface CollectionItemProps {
	title: string;
	subtitle: string;
	onClick: () => void;
}

function CollectionItem({ title, subtitle, onClick }: CollectionItemProps) {
	return (
		<Button
			variant="outline"
			className="h-auto justify-between rounded-md py-2"
			onClick={onClick}
		>
			<div className="text-left">
				<p className="font-medium">{title}</p>
				<p className="text-muted-foreground text-xs">{subtitle}</p>
			</div>
			<HugeiconsIcon icon={ArrowRightIcon} className="size-4" />
		</Button>
	);
}

interface StickerItemProps {
	iconName: string;
	onAdd: (iconName: string) => void;
	isAdding?: boolean;
	capSize?: boolean;
}

function StickerItem({
	iconName,
	onAdd,
	isAdding,
	capSize = false,
}: StickerItemProps) {
	const [imageError, setImageError] = useState(false);
	const [hostIndex, setHostIndex] = useState(0);

	useEffect(() => {
		if (!iconName) {
			return;
		}
		setImageError(false);
		setHostIndex(0);
	}, [iconName]);

	const displayName = iconName.split(":")[1] || iconName;
	const collectionPrefix = iconName.split(":")[0];

	const preview = imageError ? (
		<div className="flex size-full items-center justify-center p-2">
			<span className="text-muted-foreground text-center text-xs break-all">
				{displayName}
			</span>
		</div>
	) : (
		<div className="flex size-full items-center justify-center p-4">
			<Image
				src={
					hostIndex === 0
						? getIconSvgUrl(iconName, { width: 64, height: 64 })
						: buildIconSvgUrl(
								ICONIFY_HOSTS[Math.min(hostIndex, ICONIFY_HOSTS.length - 1)],
								iconName,
								{ width: 64, height: 64 },
							)
				}
				alt={displayName}
				width={64}
				height={64}
				className="size-full object-contain"
				style={
					capSize
						? {
								maxWidth: "var(--sticker-max, 160px)",
								maxHeight: "var(--sticker-max, 160px)",
							}
						: undefined
				}
				onError={() => {
					const next = hostIndex + 1;
					if (next < ICONIFY_HOSTS.length) {
						setHostIndex(next);
					} else {
						setImageError(true);
					}
				}}
				loading="lazy"
				unoptimized
			/>
		</div>
	);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div
					className={cn(
						"relative",
						isAdding && "pointer-events-none opacity-50",
					)}
				>
					<DraggableItem
						name={displayName}
						preview={preview}
						dragData={{
							id: iconName,
							type: "sticker",
							name: displayName,
							iconName,
						}}
						onAddToTimeline={() => onAdd(iconName)}
						aspectRatio={1}
						shouldShowLabel={false}
						isRounded={true}
						variant="card"
						className=""
						containerClassName="w-full"
					/>
					{isAdding && (
						<div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/60">
							<Spinner className="size-6 text-white" />
						</div>
					)}
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<div className="space-y-1">
					<p className="font-medium">{displayName}</p>
					<p className="text-muted-foreground text-xs">{collectionPrefix}</p>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
