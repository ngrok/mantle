// oxlint-disable no-unused-vars -- the fixture declares names that only code the codemod deletes reads
import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
// negative: a binding read only inside a shadowed call keeps its import
import shadowCssUrl from "@ngrok/mantle/mantle-dark.css?url";
import "@ngrok/mantle/mantle-dark.css?url";
import { mantleStyleSheetUrls } from "@ngrok/mantle/theme";
import {
	mantleStyleSheetUrls as toUrls,
	preventWrongThemeFlashScriptContent,
} from "@ngrok/mantle/theme";
import { otherUrls } from "./other";

const themeUrls = mantleStyleSheetUrls({ darkCssUrl });

const aliasedUrls = toUrls({ darkCssUrl });

export const script = preventWrongThemeFlashScriptContent();

// negative: another library's function keeps its call
export const otherThemeUrls = otherUrls({ url: "/other.css" });

// negative: a local binding shadows the import
export function build(toUrls: (urls: object) => object) {
	const urls = toUrls({ url: shadowCssUrl });
	return urls;
}
