import { cn } from "@/utils/ui";
import type React from "react";

type ProseProps = React.HTMLAttributes<HTMLElement> & {
	as?: "article";
	html: string;
};

function Prose({ children, html, className }: ProseProps) {
	return (
		<article
			className={cn(
				"prose prose-h2:font-semibold prose-h1:text-xl prose-a:text-blue-600 prose-p:first:mt-0 dark:prose-invert mx-auto max-w-none px-2",
				className,
			)}
		>
			{html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : children}
		</article>
	);
}

export default Prose;
