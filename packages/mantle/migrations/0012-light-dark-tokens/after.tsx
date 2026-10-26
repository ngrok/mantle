// oxlint-disable no-unused-vars -- the fixture declares names that only code the codemod deletes reads
import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";

// negative: a binding read only by a declaration that stays keeps its import
import liveCssUrl from "@ngrok/mantle/mantle-dark.css?url";
// negative: a binding read only by a shadowed element's declaration keeps its import
import shadowedCssUrl from "@ngrok/mantle/mantle-dark.css?url";
import {
	MantleStyleSheets,
	mantleStyleSheetUrls,
	MantleStyleSheets as Sheets,
	PreventWrongThemeFlashScript,
} from "@ngrok/mantle/theme";
import type { MantleThemeCssUrls } from "@ngrok/mantle/theme";

import { OtherSheets, otherUrls } from "./other";
import { MantleStyleSheets as OtherMantleStyleSheets } from "./other";

// negative: an exported const can have readers in another module
export const exportedUrls = mantleStyleSheetUrls({ darkCssUrl });

// negative: a const that other code reads stays
const loggedUrls = mantleStyleSheetUrls({ darkCssUrl });
console.log(loggedUrls);

// negative: a const that other code reads stays, and so does the import it reads
const liveUrls = mantleStyleSheetUrls({ darkCssUrl: liveCssUrl });
console.log(liveUrls);

// negative: a const that a shadowed element reads stays
const shadowedUrls = mantleStyleSheetUrls({ darkCssUrl: shadowedCssUrl });

// negative: a type annotation keeps its import
export const typedUrls: MantleThemeCssUrls = { darkCssUrl: "/dark.css" };

// negative: another library's function keeps its call
const otherThemeUrls = otherUrls({ darkCssUrl });

export function Head({ nonce, show }: { nonce: string; show: boolean }) {
	return (
		<head>
			<PreventWrongThemeFlashScript nonce={nonce} />

			{/* negative: a deletion inside an expression would leave it empty */}
			{show && <MantleStyleSheets {...loggedUrls} />}
			{/* negative: another library's component stays */}
			<OtherSheets {...otherThemeUrls} />
			<OtherMantleStyleSheets darkCssUrl={darkCssUrl} />
		</head>
	);
}

// negative: a local binding shadows the import
export function Shadowed({ MantleStyleSheets }: { MantleStyleSheets: (props: object) => null }) {
	return (
		<head>
			<MantleStyleSheets {...shadowedUrls} />
		</head>
	);
}

/* oxlint-disable no-var, block-scoped-var -- a hoisted `var` is the shape under test */
// negative: a `var` in a nested block shadows the import in the whole function
// Why lowercase: React Compiler does not compile a `var`.
export function hoistedShadow() {
	if (OtherSheets) {
		var Sheets = OtherSheets;
	}
	return (
		<head>
			<Sheets />
		</head>
	);
}
/* oxlint-enable no-var, block-scoped-var */

// negative: a loop variable shadows the import
export function LoopShadow({ sheets }: { sheets: Array<typeof OtherSheets> }) {
	for (const MantleStyleSheets of sheets) {
		return (
			<head>
				<MantleStyleSheets />
			</head>
		);
	}
	return null;
}
