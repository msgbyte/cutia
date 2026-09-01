import { createNavigation } from "@i18next-toolkit/nextjs-approuter/navigation";
import {
	forwardRef,
	type ComponentPropsWithoutRef,
} from "react";
import { i18nConfig } from "../i18n.config";
import { isExternalHref } from "./navigation-utils";

const navigation = createNavigation(i18nConfig);
const BaseLink = navigation.Link;

type BaseLinkProps = ComponentPropsWithoutRef<typeof BaseLink>;
type LinkProps = BaseLinkProps & ComponentPropsWithoutRef<"a">;

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
	({ href, ...props }, ref) => {
		if (typeof href === "string" && isExternalHref(href)) {
			return <a ref={ref} href={href} {...props} />;
		}

		return <BaseLink ref={ref} href={href} {...props} />;
	},
);

Link.displayName = "Link";

export const { redirect, usePathname, useRouter } = navigation;
