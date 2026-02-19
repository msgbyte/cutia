"use client";

import { Button } from "../ui/button";
import { ArrowRight, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DEFAULT_LOGO_URL, SOCIAL_LINKS } from "@/constants/site-constants";

export function Hero() {
	return (
		<section className="relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center overflow-hidden px-4">
			<div className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 via-transparent to-transparent" />
				<div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full border border-border/20" />
				<div className="absolute top-1/4 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full border border-border/15" />
				<div className="absolute top-1/4 left-1/2 h-[200px] w-[200px] -translate-x-1/2 rounded-full border border-border/10" />
			</div>

			<div className="mx-auto flex max-w-4xl flex-col items-center text-center">
				<div className="mb-8 flex items-center gap-3 rounded-full border border-border/60 bg-muted/30 px-4 py-2">
					<Image
						src={DEFAULT_LOGO_URL}
						alt="Cutia"
						width={20}
						height={20}
						className="dark:invert"
					/>
					<span className="text-muted-foreground text-sm font-medium">
						Privacy-first video editing
					</span>
				</div>

				<h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl">
					Edit videos,
					<br />
					<span className="text-muted-foreground">
						right in your browser
					</span>
				</h1>

				<p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg font-light leading-relaxed md:text-xl">
					A simple yet powerful open-source video editor. No uploads, no
					tracking — your media stays on your device.
				</p>

				<div className="flex flex-col items-center gap-4 sm:flex-row">
					<Link href="/projects">
						<Button
							variant="foreground"
							type="button"
							size="lg"
							className="h-12 gap-2 px-8 text-base"
						>
							<Play className="size-4" />
							Start editing
						</Button>
					</Link>
					<Link
						href={SOCIAL_LINKS.github}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Button
							variant="outline"
							type="button"
							size="lg"
							className="h-12 px-8 text-base"
						>
							View on GitHub
							<ArrowRight className="size-4" />
						</Button>
					</Link>
				</div>
			</div>

			<div className="pointer-events-none absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-background to-transparent" />
		</section>
	);
}
