import { Anchor } from "@ngrok/mantle/anchor";
import { VisuallyHidden } from "@ngrok/mantle/visually-hidden";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Visually Hidden docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<p>
				Read the{" "}
				<Anchor href="https://status.ngrok.com" target="_blank" rel="noreferrer">
					status page
					<VisuallyHidden> (opens in a new tab)</VisuallyHidden>
				</Anchor>{" "}
				before you file an incident.
			</p>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Visually Hidden docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<table className="w-full text-sm">
				<VisuallyHidden asChild>
					<caption>Monthly revenue by region</caption>
				</VisuallyHidden>
				<thead>
					<tr>
						<th className="text-left font-medium">Region</th>
						<th className="text-right font-medium">Revenue</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>North America</td>
						<td className="text-right">$1,204</td>
					</tr>
					<tr>
						<td>Europe</td>
						<td className="text-right">$986</td>
					</tr>
				</tbody>
			</table>
		</PreviewCanvas>
	);
}
