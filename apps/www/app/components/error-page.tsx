import { Button } from "@ngrok/mantle/button";
import { href, Link } from "react-router";

type ErrorPageProps = {
	/** HTTP status to display (e.g. `404`, `500`). */
	status: number;
};

/**
 * Full-page error view shared by the 404 splat route and the root error
 * boundary. Mirrors the ngrok dot-com www 404 — a large gradient status
 * number, a playful heading, and a single neutral button back home.
 *
 * @example
 * <ErrorPage status={404} />
 */
export function ErrorPage({ status }: ErrorPageProps) {
	const isNotFound = status === 404;

	return (
		<section className="relative flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center md:py-20">
			<div className="relative flex flex-col items-center gap-8">
				<p className="font-family text-strong text-8xl leading-none md:text-9xl">
					<span className="bg-[linear-gradient(98deg,var(--color-amber-700)_1.35%,var(--color-lime-700)_18.48%,var(--color-emerald-700)_38.35%,var(--color-sky-700)_58.63%,var(--color-purple-700)_79.7%,var(--color-rose-700)_100%)] bg-clip-text text-transparent">
						{status}
					</span>
				</p>
				<h1 className="font-family text-strong max-w-xl text-5xl leading-none md:text-6xl">
					{isNotFound ? (
						<>
							We haven’t shrimped that page yet.{" "}
							<span aria-hidden="true" className="text-[0.75em]">
								🦐
							</span>
						</>
					) : (
						"Something went wrong."
					)}
				</h1>
				<Button asChild priority="neutral" appearance="filled">
					<Link to={href("/")}>Back home</Link>
				</Button>
			</div>
		</section>
	);
}
