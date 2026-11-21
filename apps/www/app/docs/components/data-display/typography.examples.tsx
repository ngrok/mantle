import { Typography } from "@ngrok/mantle/typography";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Typography docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Typography.Root>
				<Typography.H1>Endpoints</Typography.H1>
				<Typography.P className="text-lead">Each endpoint gets a public URL.</Typography.P>
				<Typography.H2>Traffic policy</Typography.H2>
				<Typography.P>Attach a traffic policy to filter, route, or rewrite requests.</Typography.P>
			</Typography.Root>
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

/** The "Another level's look" example on the Typography docs page. */
export function AnotherLevelsLookExample() {
	return (
		<PreviewCanvas>
			<Typography.H2 className="text-heading-4">Danger zone</Typography.H2>
		</PreviewCanvas>
	);
}

/** The "Lead paragraph" example on the Typography docs page. */
export function LeadParagraphExample() {
	return (
		<PreviewCanvas className="flex-col items-start gap-2">
			<Typography.P className="text-lead">Put your app online in one command.</Typography.P>
			<Typography.P>
				ngrok gives each agent a public URL and forwards its traffic to your app.
			</Typography.P>
		</PreviewCanvas>
	);
}

/** The "HTML from a CMS" example on the Typography docs page. */
export function HtmlFromACmsExample() {
	const html =
		"<h2>Install the agent</h2><p>Download the agent for your platform.</p><ul><li>macOS</li><li>Linux</li><li>Windows</li></ul>";

	return (
		<PreviewCanvas>
			<Typography.Root asChild>
				<article dangerouslySetInnerHTML={{ __html: html }} />
			</Typography.Root>
		</PreviewCanvas>
	);
}

/** The "A scale for one section" example on the Typography docs page. */
export function AScaleForOneSectionExample() {
	return (
		<PreviewCanvas>
			<section className="[--text-heading-1--font-weight:700] [--text-heading-1--line-height:1] [--text-heading-1:4rem]">
				<Typography.H1>Put your app online</Typography.H1>
			</section>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Typography docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Typography.Root asChild>
				<article>
					<Typography.H2>Release notes</Typography.H2>
					<Typography.P>This release adds traffic policy support to agent endpoints.</Typography.P>
				</article>
			</Typography.Root>
		</PreviewCanvas>
	);
}
