import { Badge } from "@ngrok/mantle/badge";
import { colors } from "@ngrok/mantle/color";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { Link, href } from "react-router";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Badge docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Badge appearance="muted" color="success">
				Online
			</Badge>
		</PreviewCanvas>
	);
}

/** The "Choosing a color" example on the Badge docs page. */
export function ChoosingAColorExample() {
	return (
		<PreviewCanvas className="p-4 md:p-8">
			<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				{colors.map((color) => (
					<li key={color} className="flex flex-col gap-2">
						<Badge appearance="muted" color={color}>
							Muted {color}
						</Badge>
						<Badge appearance="muted" color={color} icon={<GlobeHemisphereWestIcon />}>
							Muted {color}
						</Badge>
					</li>
				))}
			</ul>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Badge docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Badge appearance="muted" asChild color="pink" icon={<GlobeHemisphereWestIcon />}>
				<Link to={href("/base/colors")} target="_top">
					See our colors!
				</Link>
			</Badge>
		</PreviewCanvas>
	);
}
