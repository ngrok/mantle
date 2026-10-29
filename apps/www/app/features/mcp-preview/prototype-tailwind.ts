import mantleCss from "@ngrok/mantle/mantle.css?raw";

/**
 * Compiles the Tailwind classes a prototype writes, in the browser, against
 * mantle's theme. The site stylesheet holds only the classes the site uses, so
 * a prototype class that the site never uses has no rule without this step.
 *
 * Why strip `tw-animate-css`: the browser compiler cannot load a package
 * import, and the site stylesheet already holds those animations.
 *
 * @example
 * // Safe to call more than once: the compiler starts on the first call.
 * await startPrototypeTailwind();
 */
export function startPrototypeTailwind(): Promise<unknown> {
	started ??= start();
	return started;
}

let started: Promise<unknown> | undefined;

function start() {
	const style = document.createElement("style");
	style.setAttribute("type", "text/tailwindcss");
	style.textContent = mantleCss.replace(/^@import\s+"tw-animate-css";$/m, "");
	document.head.append(style);
	return import("@tailwindcss/browser");
}
