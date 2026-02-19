import { OcDataBuddyIcon } from "@cutia/ui/icons";

export const SITE_URL = "https://cutia.app";

export const SITE_INFO = {
	title: "Cutia",
	description:
		"A simple but powerful video editor that gets the job done. In your browser.",
	url: SITE_URL,
	openGraphImage: "/open-graph/default.jpg",
	twitterImage: "/open-graph/default.jpg",
	favicon: "/logos/cutia/svg/logo.svg",
};

export type ExternalTool = {
	name: string;
	description: string;
	url: string;
	icon: React.ElementType;
};

export const EXTERNAL_TOOLS: ExternalTool[] = [
	{
		name: "Databuddy",
		description: "GDPR compliant analytics and user insights for Cutia",
		url: "https://databuddy.cc?utm_source=cutia",
		icon: OcDataBuddyIcon,
	},
];

export const DEFAULT_LOGO_URL = "/logos/cutia/svg/logo.svg";

export const SOCIAL_LINKS = {
	x: "https://x.com/cutiaapp",
	github: "https://github.com/msgbyte/cutia",
	discord: "https://discord.com/invite/Mu3acKZvCp",
};

export type Sponsor = {
	name: string;
	url: string;
	logo: string;
	description: string;
};

export const SPONSORS: Sponsor[] = [
	{
		name: "Fal.ai",
		url: "https://fal.ai?utm_source=cutia",
		logo: "/logos/others/fal.svg",
		description: "Generative image, video, and audio models all in one place.",
	},
	{
		name: "Vercel",
		url: "https://vercel.com?utm_source=cutia",
		logo: "/logos/others/vercel.svg",
		description: "Platform where we deploy and host Cutia.",
	},
];
