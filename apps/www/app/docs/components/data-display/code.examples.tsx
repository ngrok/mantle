import { Anchor } from "@ngrok/mantle/anchor";
import { Code } from "@ngrok/mantle/code";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Code docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<p>
				Use the <Code>console.log()</Code> function to debug your code.
			</p>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Code docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Code asChild>
				<Anchor href="https://ngrok.com/docs">/api/components.json</Anchor>
			</Code>
		</PreviewCanvas>
	);
}

/** The "Translation" example on the Code docs page. */
export function TranslationExample() {
	return (
		<PreviewCanvas>
			<p>
				Open the <Code translate="yes">dashboard</Code> to see your endpoints.
			</p>
		</PreviewCanvas>
	);
}
