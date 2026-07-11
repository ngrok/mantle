import { cx } from "@ngrok/mantle/cx";
import { Outlet } from "react-router";
import { LayoutsNavigation } from "~/components/layouts-navigation";
import { PageLayout } from "~/components/page-layout";

/**
 * Layout route for the layouts section. Renders the layouts sidebar alongside
 * the page outlet on a full-width canvas: layout demos need the horizontal
 * room, but MDX flow content keeps a readable measure, centered in the
 * canvas — blocks marked `data-full-bleed` (e.g. `CodeExample`) opt out and
 * span the whole canvas.
 */
export default function LayoutsLayout() {
	return (
		<PageLayout
			className={cx(
				"max-w-full",
				"[&_[data-mdx-content]>*]:mx-auto [&_[data-mdx-content]>*]:max-w-3xl",
				"[&_[data-mdx-content]>[data-full-bleed]]:max-w-none",
			)}
			sidebar={<LayoutsNavigation />}
		>
			<Outlet />
		</PageLayout>
	);
}
