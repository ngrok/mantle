// oxlint-disable no-unused-vars -- the fixture declares names that only code the codemod deletes reads
import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
// negative: a binding read only inside a shadowed call keeps its import
import shadowCssUrl from "@ngrok/mantle/mantle-dark.css?url";
import "@ngrok/mantle/mantle-dark.css?url";
// negative: a binding read by a declaration with a sibling keeps its import
import siblingCssUrl from "@ngrok/mantle/mantle-dark.css?url";
import { mantleStyleSheetUrls } from "@ngrok/mantle/theme";
import {
	mantleStyleSheetUrls as toUrls,
	preventWrongThemeFlashScriptContent,
} from "@ngrok/mantle/theme";
import { otherUrls } from "./other";

const themeUrls = mantleStyleSheetUrls({ darkCssUrl });

const aliasedUrls = toUrls({ darkCssUrl });

export const script = preventWrongThemeFlashScriptContent();

// negative: a declaration with a sibling declarator stays
export const siblingCount = 1;
const siblingUrls = toUrls({ darkCssUrl: siblingCssUrl }),
	siblingLabel = "dark";
console.log(siblingLabel);

// negative: another library's function keeps its call
export const otherThemeUrls = otherUrls({ url: "/other.css" });

// negative: a local binding shadows the import
export function build(toUrls: (urls: object) => object) {
	const urls = toUrls({ url: shadowCssUrl });
	return urls;
}
