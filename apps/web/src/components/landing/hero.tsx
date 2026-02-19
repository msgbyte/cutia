"use client";

import { Button } from "../ui/button";
import { ArrowRight, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DEFAULT_LOGO_URL, SOCIAL_LINKS } from "@/constants/site-constants";
import { motion } from "motion/react";

const floatingParticles = Array.from({ length: 6 }, (_, i) => ({
	id: i,
	size: 2 + Math.random() * 3,
	x: 10 + Math.random() * 80,
	y: 10 + Math.random() * 80,
	duration: 15 + Math.random() * 20,
	delay: Math.random() * -20,
}));

export function Hero() {
	return (
		<section className="relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center overflow-hidden px-4">
			<div className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 via-transparent to-transparent" />

				{[600, 400, 200].map((size, index) => (
					<motion.div
						key={size}
						className="absolute top-1/4 left-1/2 rounded-full border border-border/20"
						style={{
							width: size,
							height: size,
							x: "-50%",
						}}
						animate={{
							scale: [1, 1.05, 1],
							opacity: [0.2 + index * 0.1, 0.4 + index * 0.1, 0.2 + index * 0.1],
						}}
						transition={{
							duration: 4 + index,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeInOut",
							delay: index * 0.5,
						}}
					/>
				))}

				<motion.div
					className="absolute top-1/6 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]"
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.3, 0.6, 0.3],
					}}
					transition={{
						duration: 8,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
				/>

				{floatingParticles.map((particle) => (
					<motion.div
						key={particle.id}
						className="absolute rounded-full bg-foreground/20"
						style={{
							width: particle.size,
							height: particle.size,
							left: `${particle.x}%`,
							top: `${particle.y}%`,
						}}
						animate={{
							y: [0, -30, 0],
							opacity: [0, 0.6, 0],
						}}
						transition={{
							duration: particle.duration,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeInOut",
							delay: particle.delay,
						}}
					/>
				))}
			</div>

			<div className="mx-auto flex max-w-4xl flex-col items-center text-center">
				<motion.div
					className="mb-8 flex items-center gap-3 rounded-full border border-border/60 bg-muted/30 px-4 py-2"
					initial={{ opacity: 0, y: 20, scale: 0.9 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={{ duration: 0.6, ease: "easeOut" }}
				>
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
				</motion.div>

				<motion.h1
					className="mb-6 text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl"
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
				>
					Edit videos,
					<br />
					<motion.span
						className="text-muted-foreground inline-block"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
					>
						right in your browser
					</motion.span>
				</motion.h1>

				<motion.p
					className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg font-light leading-relaxed md:text-xl"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
				>
					A simple yet powerful open-source video editor. No uploads, no
					tracking — your media stays on your device.
				</motion.p>

				<motion.div
					className="flex flex-col items-center gap-4 sm:flex-row"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.65, ease: "easeOut" }}
				>
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
				</motion.div>
			</div>

			<div className="pointer-events-none absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-background to-transparent" />
		</section>
	);
}
