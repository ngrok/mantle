import { Anchor } from "@/anchor";
import { Badge } from "@/badge";
import { CodeBlock, CodeBlockBody, CodeBlockCode, CodeBlockCopyButton, fmtCode } from "@/code-block";
import { colors } from "@/color";
import { InlineCode } from "@/inline-code";
import { GlobeHemisphereWest } from "@phosphor-icons/react/GlobeHemisphereWest";
import type { HeadersFunction, MetaFunction } from "@remix-run/node";
import { Example } from "~/components/example";
import { Link } from "~/components/link";
import { PreviewBadge } from "~/components/preview-badge";
import {
	PropDefaultValueCell,
	PropDescriptionCell,
	PropNameCell,
	PropRow,
	PropsTable,
	PropTypeCell,
	ReactNodePropType,
	StringPropType,
} from "~/components/props-table";

export const meta: MetaFunction = () => {
	return [
		{ title: "@ngrok/mantle — Badge" },
		{ name: "description", content: "mantle is ngrok's UI library and design system" },
	];
};

export const headers: HeadersFunction = () => {
	return {
		"Cache-Control": "max-age=300, stale-while-revalidate=604800",
	};
};

export default function Page() {
	return (
		<div className="space-y-16">
			<section className="space-y-4">
				<div className="flex items-center gap-3">
					<h1 className="text-5xl font-medium">Badge</h1>
					<PreviewBadge />
				</div>
				<p className="text-xl text-body">
					A Badge is a non-interactive component used to highlight important information or to visually indicate the
					status of an item.
				</p>
				<div>
					<Example>
						<ul role="list" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
							{colors.map((color) => (
								<li key={color} className="flex flex-col gap-2">
									<Badge appearance="muted" color={color}>
										Muted {color}
									</Badge>
									<Badge appearance="muted" color={color} icon={<GlobeHemisphereWest />}>
										Muted {color}
									</Badge>
								</li>
							))}
						</ul>
					</Example>
					<CodeBlock className="rounded-b-lg rounded-t-none">
						<CodeBlockBody>
							<CodeBlockCopyButton />
							<CodeBlockCode
								language="tsx"
								value={fmtCode`
									import { Badge } from "@ngrok/mantle/badge";
									import { GlobeHemisphereWest } from "@phosphor-icons/react/GlobeHemisphereWest";

									<Badge appearance="muted" color="neutral">
										Muted neutral
									</Badge>
									<Badge appearance="muted" color="neutral" icon={<GlobeHemisphereWest />}>
										Muted neutral
									</Badge>
								`}
							/>
						</CodeBlockBody>
					</CodeBlock>
				</div>
			</section>

			<section className="space-y-4">
				<h2 id="api" className="text-3xl font-medium">
					API Reference
				</h2>
				<p className="text-xl text-body">
					The <InlineCode>Badge</InlineCode> accepts the following props in addition to the{" "}
					<Anchor href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span">
						standard HTML span attributes
					</Anchor>
					.
				</p>
				<PropsTable>
					<PropRow>
						<PropNameCell name="appearance" />
						<PropTypeCell>
							<ul>
								<li>
									<StringPropType value="muted" />
								</li>
							</ul>
						</PropTypeCell>
						<PropDefaultValueCell />
						<PropDescriptionCell>
							<p>
								Defines the visual style of the <InlineCode>Badge</InlineCode>. Currently only supports the{" "}
								<InlineCode>muted</InlineCode> variant.
							</p>
						</PropDescriptionCell>
					</PropRow>
					<PropRow>
						<PropNameCell name="color" optional />
						<PropTypeCell>
							<ul>
								{colors.map((color) => (
									<li key={color}>
										<StringPropType value={color} />
									</li>
								))}
							</ul>
						</PropTypeCell>
						<PropDefaultValueCell>
							<StringPropType value="neutral" />
						</PropDefaultValueCell>
						<PropDescriptionCell>
							<p>
								The color variant of the <InlineCode>Badge</InlineCode>. Supports all{" "}
								<Link to="/base/colors">named colors</Link>, both functional and from the color palette.
							</p>
						</PropDescriptionCell>
					</PropRow>
					<PropRow>
						<PropNameCell name="icon" optional />
						<PropTypeCell>
							<ReactNodePropType />
						</PropTypeCell>
						<PropDefaultValueCell />
						<PropDescriptionCell>
							An icon to render inside the badge. Will be automatically sized for you.
						</PropDescriptionCell>
					</PropRow>
				</PropsTable>
			</section>
		</div>
	);
}
