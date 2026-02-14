import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { cn } from "@/utils/ui";

interface BasePageProps {
	children: React.ReactNode;
	className?: string;
	mainClassName?: string;
	maxWidth?: "3xl" | "6xl" | "full";
	title?: string;
	description?: string;
}

export function BasePage({
	children,
	className = "",
	mainClassName = "",
	maxWidth = "3xl",
	title,
	description,
}: BasePageProps) {
	const maxWidthClass = {
		"3xl": "max-w-3xl",
		"6xl": "max-w-6xl",
		full: "max-w-full",
	}[maxWidth];

	return (
		<section className={cn("bg-background min-h-screen", className)}>
			<Header />
			<main
				className={cn(
					"relative container mx-auto flex flex-col gap-12 px-6 pt-12 pb-24 md:pt-24",
					maxWidthClass,
					mainClassName,
				)}
			>
				{title && description && (
					<div className="flex flex-col gap-8 text-center">
						<h1 className="text-5xl font-bold tracking-tight md:text-6xl">
							{title}
						</h1>
						<p className="text-muted-foreground mx-auto max-w-2xl text-xl leading-relaxed">
							{description}
						</p>
					</div>
				)}
				{children}
			</main>
			<Footer />
		</section>
	);
}
