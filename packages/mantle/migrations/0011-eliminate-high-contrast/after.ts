import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";

import { mantleStyleSheetUrls } from "@ngrok/mantle/theme";
import { otherUrls } from "./other";

export const themeUrls = mantleStyleSheetUrls({
	darkCssUrl,
});

export const keyedUrls = mantleStyleSheetUrls({
	darkCssUrl,
});

// negative: another function's object keeps its keys
export const otherThemeUrls = otherUrls({ darkCssUrl, lightHighContrastCssUrl });

// negative: a local binding shadows the import
export function build(mantleStyleSheetUrls: (urls: object) => object) {
	return mantleStyleSheetUrls({ darkCssUrl, lightHighContrastCssUrl });
}
