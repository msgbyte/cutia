"use client";

import { Shield, Globe, Code2, Zap, Layers, MonitorPlay } from "lucide-react";
import { motion } from "motion/react";

const FEATURES = [
	{
		icon: Shield,
		title: "Privacy First",
		description:
			"Your files never leave your device. All processing happens locally in your browser — no uploads, no servers.",
	},
	{
		icon: Globe,
		title: "Works Everywhere",
		description:
			"No installation needed. Open your browser on any platform and start editing right away.",
	},
	{
		icon: Code2,
		title: "Open Source",
		description:
			"Fully open source and community-driven. Inspect the code, contribute, or fork it for your needs.",
	},
	{
		icon: Zap,
		title: "Fast & Lightweight",
		description:
			"Built for speed with modern web technologies. No bloated downloads or slow startup times.",
	},
	{
		icon: Layers,
		title: "Multi-track Timeline",
		description:
			"Professional timeline with support for video, audio, text, and sticker tracks. Drag, trim, and split with ease.",
	},
	{
		icon: MonitorPlay,
		title: "Export Anywhere",
		description:
			"Export your projects in MP4 or WebM format with adjustable quality settings.",
	},
];

export function Features() {
	return (
		<section id="features" className="relative px-4 py-24 md:py-32">
			<div className="mx-auto max-w-6xl">
				<motion.div
					className="mb-16 text-center"
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6, ease: "easeOut" }}
				>
					<h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
						Everything you need to edit
					</h2>
					<p className="text-muted-foreground mx-auto max-w-2xl text-lg">
						A focused set of tools designed for clarity and speed. No feature
						bloat — just what matters.
					</p>
				</motion.div>

				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{FEATURES.map((feature, index) => (
						<motion.div
							key={feature.title}
							className="group rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-colors hover:border-border hover:bg-card"
							initial={{ opacity: 0, y: 40 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-60px" }}
							transition={{
								duration: 0.5,
								delay: index * 0.1,
								ease: "easeOut",
							}}
							whileHover={{ y: -4, transition: { duration: 0.2 } }}
						>
							<motion.div
								className="mb-4 flex size-11 items-center justify-center rounded-xl bg-foreground/5 dark:bg-foreground/10"
								whileHover={{ scale: 1.1, rotate: 5 }}
								transition={{ type: "spring", stiffness: 400, damping: 15 }}
							>
								<feature.icon className="size-5 text-foreground/70" />
							</motion.div>
							<h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{feature.description}
							</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
