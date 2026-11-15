import { Button } from "@ngrok/mantle/button";
import { LiveRegion } from "@ngrok/mantle/live-region";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export function ResultsExample() {
	const [count, setCount] = useState(3);
	return (
		<div className="flex flex-col items-start gap-4">
			<Button
				type="button"
				appearance="filled"
				intent="neutral"
				onClick={() => setCount((current) => current + 1)}
			>
				Add a result
			</Button>
			<LiveRegion>{`${count} results found`}</LiveRegion>
			<ul className="list-disc pl-5 text-sm">
				{Array.from({ length: count }, (_, index) => (
					<li key={index}>Result {index + 1}</li>
				))}
			</ul>
		</div>
	);
}

export function AssertiveExample() {
	const [message, setMessage] = useState("");
	return (
		<div className="flex flex-col items-start gap-4">
			<Button
				type="button"
				appearance="outlined"
				intent="danger"
				onClick={() => setMessage("Session expired. Sign in again.")}
			>
				Expire the session
			</Button>
			<LiveRegion politeness="assertive">{message}</LiveRegion>
			<p className="text-muted text-sm">{message || "The session is active."}</p>
		</div>
	);
}

export function RouteAnnouncerExample() {
	const [pageName, setPageName] = useState("Dashboard");
	return (
		<div className="flex flex-col items-start gap-4">
			<nav className="flex gap-2">
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					onClick={() => setPageName("Dashboard")}
				>
					Dashboard
				</Button>
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					onClick={() => setPageName("Settings")}
				>
					Settings
				</Button>
			</nav>
			<LiveRegion>{`Navigated to ${pageName}`}</LiveRegion>
			<h3 className="text-lg font-medium">{pageName}</h3>
		</div>
	);
}

/** The first example on the Live Region docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<ResultsExample />
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Live Region docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<LiveRegion asChild>
				<p>Ready.</p>
			</LiveRegion>
			<p className="text-muted text-sm">The live region above is a hidden paragraph element.</p>
		</PreviewCanvas>
	);
}

/** The "Politeness" example on the Live Region docs page. */
export function PolitenessExample() {
	return (
		<PreviewCanvas>
			<AssertiveExample />
		</PreviewCanvas>
	);
}

/** The "Announcing route changes" example on the Live Region docs page. */
export function AnnouncingRouteChangesExample() {
	return (
		<PreviewCanvas>
			<RouteAnnouncerExample />
		</PreviewCanvas>
	);
}
