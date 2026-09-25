import { describe, expect, test } from "bun:test";
import { isExternalHref } from "../navigation-utils";

describe("isExternalHref", () => {
	test("treats absolute http and https urls as external", () => {
		expect(isExternalHref("https://github.com/msgbyte/cutia")).toBe(true);
		expect(isExternalHref("http://example.com/docs")).toBe(true);
	});

	test("keeps local paths and hash links internal", () => {
		expect(isExternalHref("/projects")).toBe(false);
		expect(isExternalHref("#features")).toBe(false);
		expect(isExternalHref("mailto:hello@example.com")).toBe(false);
	});
});
