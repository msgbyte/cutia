import type { Metadata } from "next";
import { SITE_INFO, SITE_URL } from "@/constants/site-constants";

export const baseMetaData: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: SITE_INFO.title,
	description: SITE_INFO.description,
	openGraph: {
		title: SITE_INFO.title,
		description: SITE_INFO.description,
		url: SITE_URL,
		siteName: SITE_INFO.title,
		locale: "en_US",
		type: "website",
		images: [
			{
				url: SITE_INFO.openGraphImage,
				width: 1200,
				height: 630,
				alt: "Cutia Wordmark",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: SITE_INFO.title,
		description: SITE_INFO.description,
		creator: "@cutiaapp",
		images: [SITE_INFO.twitterImage],
	},
	pinterest: {
		richPin: false,
	},
	robots: {
		index: true,
		follow: true,
	},
	icons: {
		icon: [{ url: "/logos/cutia/svg/logo.svg", type: "image/svg+xml" }],
		shortcut: ["/logos/cutia/svg/logo.svg"],
	},
	appleWebApp: {
		capable: true,
		title: SITE_INFO.title,
	},
	manifest: "/manifest.json",
	other: {},
};
