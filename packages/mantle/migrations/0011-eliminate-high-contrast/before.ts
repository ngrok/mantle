import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
import darkHighContrastCssUrl from "@ngrok/mantle/mantle-dark-high-contrast.css?url";
import lightHighContrastCssUrl from "@ngrok/mantle/mantle-light-high-contrast.css?url";
import "@ngrok/mantle/mantle-dark-high-contrast.css";
import { mantleStyleSheetUrls } from "@ngrok/mantle/theme";
import { otherUrls } from "./other";

export const themeUrls = mantleStyleSheetUrls({
	darkCssUrl,
	lightHighContrastCssUrl,
	darkHighContrastCssUrl,
});

export const keyedUrls = mantleStyleSheetUrls({
	"lightHighContrastCssUrl": lightHighContrastCssUrl,
	darkCssUrl,
	darkHighContrastCssUrl: darkHighContrastCssUrl
});

// negative: another function's object keeps its keys
export const otherThemeUrls = otherUrls({ darkCssUrl, lightHighContrastCssUrl });

// negative: a local binding shadows the import
export function build(mantleStyleSheetUrls: (urls: object) => object) {
	return mantleStyleSheetUrls({ darkCssUrl, lightHighContrastCssUrl });
}
