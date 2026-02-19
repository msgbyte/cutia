"use client";

import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTASection() {
	return (
		<section className="relative px-4 py-24 md:py-32">
			<div className="mx-auto max-w-3xl text-center">
				<div className="relative rounded-3xl border border-border/50 bg-muted/20 p-12 md:p-16">
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
		</section>
	);
}
