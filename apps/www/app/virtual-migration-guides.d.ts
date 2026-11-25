declare module "virtual:migration-guides" {
	/** One guide's index facts. `vite-plugins/migration-guides.ts` writes this shape. */
	const guides: readonly {
		/** The file name without `.mdx`, which is also the URL slug under `/migrations/`. */
		name: string;
		title: string;
		description: string;
		/** The number the release stamps, or `null` before the guide ships. */
		number: number | null;
	}[];
	export default guides;
}
