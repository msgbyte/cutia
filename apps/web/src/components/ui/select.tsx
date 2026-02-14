"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/ui";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const selectItemVariants = cva(
	"relative flex cursor-pointer select-none items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-foreground/85 outline-hidden data-[highlighted]:bg-popover-hover data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "",
				destructive: "text-destructive data-[highlighted]:bg-destructive/5 data-[highlighted]:text-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const SelectTrigger = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
	<SelectPrimitive.Trigger
		ref={ref}
		className={cn(
			"bg-accent ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-8 w-auto cursor-pointer items-center justify-between gap-1 rounded-md px-3 py-2 text-sm whitespace-nowrap focus:ring-1 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
			"focus:border-primary focus:ring-4 focus:ring-primary/10 border-transparent transition-none",
			className,
		)}
		{...props}
	>
		{children}
		<SelectPrimitive.Icon asChild>
			<ChevronDown className="size-3 opacity-50" />
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollUpButton
		ref={ref}
		className={cn(
			"flex cursor-default items-center justify-center py-1",
			className,
		)}
		{...props}
	>
		<ChevronUp className="size-4" />
	</SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollDownButton
		ref={ref}
		className={cn(
			"flex cursor-default items-center justify-center py-1",
			className,
		)}
		{...props}
	>
		<ChevronDown className="size-4" />
	</SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
	SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			ref={ref}
			className={cn(
			"bg-popover text-popover-foreground z-50 max-h-96 min-w-32 overflow-hidden rounded-2xl border p-2 shadow-lg",
				className,
			)}
			position={position}
			onCloseAutoFocus={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
			{...props}
		>
			<SelectScrollUpButton />
			<SelectPrimitive.Viewport
				className={cn(
					position === "popper" &&
						"h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)",
				)}
			>
				{children}
			</SelectPrimitive.Viewport>
			<SelectScrollDownButton />
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Label
		ref={ref}
		className={cn(
			"px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
			className,
		)}
		{...props}
	/>
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
		variant?: VariantProps<typeof selectItemVariants>["variant"];
	}
>(({ className, children, variant = "default", ...props }, ref) => (
	<SelectPrimitive.Item
		ref={ref}
		className={cn(selectItemVariants({ variant }), "pr-8 pl-2", className)}
		{...props}
	>
		<span className="absolute right-2 flex size-3.5 items-center justify-center">
			<SelectPrimitive.ItemIndicator>
				<Check className="size-4" />
			</SelectPrimitive.ItemIndicator>
		</span>
		<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
	</SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Separator
		ref={ref}
		className={cn("bg-border mx-1 my-2 h-px", className)}
		{...props}
	/>
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton,
};
