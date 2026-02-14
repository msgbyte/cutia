import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils/ui";

interface PanelBaseViewProps {
	children?: React.ReactNode;
	defaultTab?: string;
	value?: string;
	onValueChange?: (value: string) => void;
	tabs?: {
		value: string;
		label: string;
		icon?: React.ReactNode;
		content: React.ReactNode;
	}[];
	className?: string;
	ref?: React.Ref<HTMLDivElement>;
}

function ViewContent({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<ScrollArea className="flex-1 scrollbar-hidden">
			<div className={cn("p-5", className)}>{children}</div>
		</ScrollArea>
	);
}

export function PanelBaseView({
	children,
	defaultTab,
	value,
	onValueChange,
	tabs,
	className = "",
	ref,
}: PanelBaseViewProps) {
	return (
		<div className={cn("flex h-full flex-col", className)} ref={ref}>
			{!tabs || tabs.length === 0 ? (
				<ViewContent className={className}>{children}</ViewContent>
			) : (
				<Tabs
					defaultValue={defaultTab}
					value={value}
					onValueChange={onValueChange}
					className="flex h-full flex-col"
				>
					<div className="bg-background sticky top-0 z-10">
						<div className="px-3 pt-3 pb-0">
							<TabsList>
								{tabs.map((tab) => (
									<TabsTrigger key={tab.value} value={tab.value}>
										{tab.icon ? (
											<span className="mr-1 inline-flex items-center">
												{tab.icon}
											</span>
										) : null}
										{tab.label}
									</TabsTrigger>
								))}
							</TabsList>
						</div>
						<Separator className="mt-3" />
					</div>
					{tabs.map((tab) => (
						<TabsContent
							key={tab.value}
							value={tab.value}
							className="mt-0 flex min-h-0 flex-1 flex-col"
						>
							<ViewContent className={className}>{tab.content}</ViewContent>
						</TabsContent>
					))}
				</Tabs>
			)}
		</div>
	);
}
