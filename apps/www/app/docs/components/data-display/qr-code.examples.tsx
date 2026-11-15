import { QrCode } from "@ngrok/mantle/qr-code";
import { NgrokLettermarkIcon } from "@ngrok/mantle/icons";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the QR Code docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<QrCode.Root value="https://ngrok.com">
				<QrCode.Frame>
					<QrCode.Pattern />
				</QrCode.Frame>
			</QrCode.Root>
		</PreviewCanvas>
	);
}

/** The "Error correction" example on the QR Code docs page. */
export function ErrorCorrectionExample() {
	return (
		<PreviewCanvas>
			<QrCode.Root value="https://ngrok.com" ecc="H">
				<QrCode.Frame>
					<QrCode.Pattern />
				</QrCode.Frame>
				<QrCode.Overlay>
					<NgrokLettermarkIcon className="size-7" />
				</QrCode.Overlay>
			</QrCode.Root>
		</PreviewCanvas>
	);
}

/** The "Sizing" example on the QR Code docs page. */
export function SizingExample() {
	return (
		<PreviewCanvas>
			<QrCode.Root value="https://ngrok.com">
				<QrCode.Frame className="size-32">
					<QrCode.Pattern />
				</QrCode.Frame>
			</QrCode.Root>
		</PreviewCanvas>
	);
}

/** The "Quiet zone" example on the QR Code docs page. */
export function QuietZoneExample() {
	return (
		<PreviewCanvas>
			<QrCode.Root value="https://ngrok.com" quietZone={1}>
				<QrCode.Frame>
					<QrCode.Pattern />
				</QrCode.Frame>
			</QrCode.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the QR Code docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<QrCode.Root asChild value="https://ngrok.com">
				<a href="https://ngrok.com">
					<QrCode.Frame>
						<QrCode.Pattern />
					</QrCode.Frame>
				</a>
			</QrCode.Root>
		</PreviewCanvas>
	);
}
