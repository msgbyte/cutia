import type { LANGUAGES } from "@/constants/language-constants";

export type Language = (typeof LANGUAGES)[number];
export type LanguageCode = Language["code"];
