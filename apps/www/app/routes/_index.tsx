import { Suspense, use } from "react";
import { ContentLayout } from "~/components/content-layout";
import { canonicalHref } from "~/utilities/canonical-origin";
import { getDoc, loadDoc, resolveDoc } from "~/utilities/docs";
import {
	jsonLdGraphMetaDescriptor,
	mantleWebPageJsonLd,
	mantleWebsiteJsonLd,
} from "~/utilities/json-ld";
import type { Route } from "./+types/_index";

const indexFilePath = "../docs/index.mdx";
const title = "@ngrok/mantle";
const description = "mantle is ngrok's UI library and design system";

export async function loader() {
	const doc = await loadDoc(indexFilePath);
	return { toc: doc.toc };
}

export const meta: Route.MetaFunction = () => {
	const canonicalUrl = canonicalHref("/");

	return [
		{ title },
		{ name: "description", content: description },
		{ property: "og:title", content: title },
		{ name: "twitter:title", content: title },
		{ property: "og:description", content: description },
		{ name: "twitter:description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		{ property: "og:type", content: "website" },
		{ name: "og:url", property: "og:url", content: canonicalUrl },
		{ name: "twitter:url", content: canonicalUrl },
		jsonLdGraphMetaDescriptor([
			mantleWebsiteJsonLd(),
			mantleWebPageJsonLd({
				name: title,
				description,
				pathname: "/",
			}),
		]),
	];
};

export default function Page() {
	if (import.meta.env.PROD) {
		return (
			<ContentLayout markdownPath="/index.md">
				<ProdIndexContent />
			</ContentLayout>
		);
	}

	return (
		<ContentLayout markdownPath="/index.md">
			<Suspense>
				<DevIndexContent />
			</Suspense>
		</ContentLayout>
	);
}

function ProdIndexContent() {
	const doc = getDoc(indexFilePath);
	if (!doc) {
		throw Response.json({ message: "Not Found" }, { status: 404 });
	}
	const { Component } = doc;
	return <Component />;
}

function DevIndexContent() {
	const docPromise = resolveDoc(indexFilePath);
	const { Component } = use(docPromise);
	return <Component />;
}
