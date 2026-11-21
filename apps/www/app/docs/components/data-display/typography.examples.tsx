import { Code } from "@ngrok/mantle/code";
import { Typography } from "@ngrok/mantle/typography";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Typography docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="flex-col items-start gap-4">
			<Typography.H1>Endpoints</Typography.H1>
			<Typography.P className="text-paragraph-lg">Each endpoint gets a public URL.</Typography.P>
			<Typography.H2>Traffic policy</Typography.H2>
			<Typography.P>Attach a traffic policy to filter, route, or rewrite requests.</Typography.P>
		</PreviewCanvas>
	);
}

/** The "Headings" example on the Typography docs page. */
export function HeadingsExample() {
	return (
		<PreviewCanvas className="flex-col items-start gap-4">
			<Typography.H1>Heading 1</Typography.H1>
			<Typography.H2>Heading 2</Typography.H2>
			<Typography.H3>Heading 3</Typography.H3>
			<Typography.H4>Heading 4</Typography.H4>
			<Typography.H5>Heading 5</Typography.H5>
			<Typography.H6>Heading 6</Typography.H6>
		</PreviewCanvas>
	);
}

/** The "Another size" example on the Typography docs page. */
export function AnotherSizeExample() {
	return (
		<PreviewCanvas>
			<Typography.H2 className="text-heading-xl">Danger zone</Typography.H2>
		</PreviewCanvas>
	);
}

/** The "Lead paragraph" example on the Typography docs page. */
export function LeadParagraphExample() {
	return (
		<PreviewCanvas className="flex-col items-start gap-2">
			<Typography.P className="text-paragraph-lg">Put your app online in one command.</Typography.P>
			<Typography.P>
				ngrok gives each agent a public URL and forwards its traffic to your app.
			</Typography.P>
		</PreviewCanvas>
	);
}

/** The "A scale for one section" example on the Typography docs page. */
export function AScaleForOneSectionExample() {
	return (
		<PreviewCanvas>
			<section className="[--text-heading-5xl--font-weight:700] [--text-heading-5xl--letter-spacing:-0.02em] [--text-heading-5xl--line-height:1] [--text-heading-5xl:4rem]">
				<Typography.H1>Put your app online</Typography.H1>
			</section>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Typography docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<figure className="flex flex-col items-start gap-2">
				<Code>ngrok http 8080</Code>
				<Typography.P asChild className="text-muted">
					<figcaption>Start an agent endpoint for port 8080.</figcaption>
				</Typography.P>
			</figure>
		</PreviewCanvas>
	);
}
