import ReactMarkdown from "react-markdown";
import { cn } from "@/utils/ui";

export function ReactMarkdownWrapper({ children }: { children: string }) {
	return (
		<ReactMarkdown
			components={{
				a: ({ className: linkClassName, children, ...props }) => (
					<a
						className={cn("text-primary hover:underline", linkClassName)}
						target="_blank"
						rel="noopener noreferrer"
						{...props}
					>
						{children}
					</a>
				),
				strong: ({ children }) => (
					<strong className="text-foreground font-semibold">{children}</strong>
				),
			}}
		>
			{children}
		</ReactMarkdown>
	);
}
