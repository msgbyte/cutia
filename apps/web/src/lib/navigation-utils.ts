export function isExternalHref(href: string) {
	return /^https?:\/\//.test(href);
}
