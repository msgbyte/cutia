export const STICKER_CATEGORIES = [
	"all",
	"general",
	"brands",
	"emoji",
] as const;

export const STICKER_CATEGORY_CONFIG: Record<
	(typeof STICKER_CATEGORIES)[number],
	string | undefined
> = {
	all: undefined,
	general: "General",
	brands: "Brands / Social",
	emoji: "Emoji",
};
