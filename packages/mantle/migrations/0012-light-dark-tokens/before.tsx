// oxlint-disable no-unused-vars -- the fixture declares names that only code the codemod deletes reads
import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
import islandCssUrl from '@ngrok/mantle/mantle-dark.css?url';
import "@ngrok/mantle/mantle-dark.css";
import {
	MantleStyleSheets,
	mantleStyleSheetUrls,
	MantleStyleSheets as Sheets,
	mantleStyleSheetUrls as toUrls,
	PreventWrongThemeFlashScript,
} from "@ngrok/mantle/theme";
import type { MantleThemeCssUrls } from "@ngrok/mantle/theme";
import type { MantleStyleSheetsProps } from "@ngrok/mantle/theme";
import { OtherSheets, otherUrls } from "./other";
import { MantleStyleSheets as OtherMantleStyleSheets } from "./other";

const themeUrls = mantleStyleSheetUrls({ darkCssUrl });

const aliasedUrls = toUrls({ darkCssUrl: islandCssUrl });

// negative: an exported const can have readers in another module
export const exportedUrls = mantleStyleSheetUrls({ darkCssUrl });

// negative: a const that other code reads stays
const loggedUrls = mantleStyleSheetUrls({ darkCssUrl });
console.log(loggedUrls);

// negative: a type annotation keeps its import
export const typedUrls: MantleThemeCssUrls = { darkCssUrl: "/dark.css" };

// negative: another library's function keeps its call
const otherThemeUrls = otherUrls({ darkCssUrl });

export function Head({ nonce, show }: { nonce: string; show: boolean }) {
	return (
		<head>
			<PreventWrongThemeFlashScript nonce={nonce} />
			<MantleStyleSheets {...themeUrls} />
			<Sheets {...aliasedUrls} />
			<MantleStyleSheets darkCssUrl={darkCssUrl} />
			{/* negative: a deletion inside an expression would leave it empty */}
			{show && <MantleStyleSheets {...loggedUrls} />}
			{/* negative: another library's component stays */}
			<OtherSheets {...otherThemeUrls} />
			<OtherMantleStyleSheets darkCssUrl={darkCssUrl} />
		</head>
	);
}

// negative: a local binding shadows the import
export function Shadowed({ MantleStyleSheets }: { MantleStyleSheets: () => null }) {
	return (
		<head>
			<MantleStyleSheets />
		</head>
	);
}
