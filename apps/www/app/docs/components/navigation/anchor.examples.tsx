import { Anchor } from "@ngrok/mantle/anchor";
import { BookIcon } from "@phosphor-icons/react/Book";
import { ShrimpIcon } from "@phosphor-icons/react/Shrimp";
import { Link, href } from "react-router";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Anchor docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<p>
				This link will go to <Anchor href="https://ngrok.com/">ngrok.com</Anchor>!
			</p>
		</PreviewCanvas>
	);
}

/** The "Icons" example on the Anchor docs page. */
export function IconsExample() {
	return (
		<PreviewCanvas className="flex-col">
			<p>
				This icon renders at the start:{" "}
				<Anchor href="https://ngrok.com/docs" icon={<BookIcon />}>
					ngrok docs
				</Anchor>
				!
			</p>
			<p>
				And this icon renders at the end:{" "}
				<Anchor href="https://dashboard.ngrok.com" icon={<ShrimpIcon />} iconPlacement="end">
					ngrok dashboard
				</Anchor>
				!
			</p>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Anchor docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="flex-col">
			<Anchor asChild>
				<Link to={href("/base/colors")}>See our colors!</Link>
			</Anchor>
		</PreviewCanvas>
	);
}
