import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import Image from "next/image";
import { DEFAULT_LOGO_URL, SOCIAL_LINKS } from "@/constants/site-constants";

interface FooterLink {
	label: string;
	href: string;
}

const footerLinks: FooterLink[] = [];

const socialLinks = [
	{ href: SOCIAL_LINKS.github, icon: FaGithub, label: "GitHub" },
];

export function Footer() {
	return (
		<footer className="border-t">
			<div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-8 sm:flex-row sm:justify-between">
				<div className="flex items-center gap-6">
					<Link href="/" className="flex items-center gap-2">
						<Image
							src={DEFAULT_LOGO_URL}
							alt="Cutia"
							width={20}
							height={20}
							className="dark:invert"
						/>
						<span className="text-sm font-semibold">Cutia</span>
					</Link>
					<nav className="flex items-center gap-4">
						{footerLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="text-muted-foreground hover:text-foreground text-xs transition-colors"
							>
								{link.label}
							</Link>
						))}
					</nav>
				</div>

				<div className="flex items-center gap-4">
					{socialLinks.map((social) => (
						<Link
							key={social.href}
							href={social.href}
							className="text-muted-foreground hover:text-foreground transition-colors"
							target="_blank"
							rel="noopener noreferrer"
							aria-label={social.label}
						>
							<social.icon className="size-4" />
						</Link>
					))}
					<span className="text-muted-foreground ml-2 text-xs">
						© {new Date().getFullYear()} Cutia
					</span>
				</div>
			</div>
		</footer>
	);
}
