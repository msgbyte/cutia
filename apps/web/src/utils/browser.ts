export function isTypableDOMElement({
	element,
}: {
	element: HTMLElement;
}): boolean {
	if (element.isContentEditable) return true;

	if (element.tagName === "INPUT") {
		return !(element as HTMLInputElement).disabled;
	}

	if (element.tagName === "TEXTAREA") {
		return !(element as HTMLTextAreaElement).disabled;
	}

	return false;
}
