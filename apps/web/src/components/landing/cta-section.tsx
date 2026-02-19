"use client";

import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

export function CTASection() {
	return (
		<section className="relative px-4 py-24 md:py-32">
			<motion.div
				className="mx-auto max-w-3xl text-center"
				initial={{ opacity: 0, y: 40 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: "-100px" }}
				transition={{ duration: 0.7, ease: "easeOut" }}
			>
				<div className="relative overflow-hidden rounded-3xl border border-border/50 bg-muted/20 p-12 md:p-16">
					<motion.div
						className="absolute -top-1/2 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[100px]"
						animate={{
							scale: [1, 1.3, 1],
							opacity: [0.3, 0.5, 0.3],
						}}
						transition={{
							duration: 6,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeInOut",
						}}
					/>

					<div className="relative">
						<h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
							Ready to start editing?
						</h2>
						<p className="text-muted-foreground mx-auto mb-8 max-w-lg text-lg">
							No sign-up required. Open the editor and start creating — your
							first project is just a click away.
						</p>
						<Link href="/projects">
							<Button
								variant="foreground"
								type="button"
								size="lg"
								className="h-12 gap-2 px-8 text-base"
							>
								Open Editor
								<ArrowRight className="size-4" />
							</Button>
						</Link>
					</div>
				</div>
			</motion.div>
		</section>
	);
}
