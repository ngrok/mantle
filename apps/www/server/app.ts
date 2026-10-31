// The docs site's app server. The `appServer` Vite plugin bundles this module into
// `build/server/app-server.js`, and `app-server serve` runs it.
import { createServer, defaultPlugins } from "@ngrok/app-server";
import { prerenderedDocuments } from "./prerendered-documents.ts";

const { plugin, ...prerendered } = prerenderedDocuments();

export default createServer({
	plugins: defaultPlugins({ beforeStatic: [plugin], prerendered }),
	trustForwardedProto: process.env.TRUST_FORWARDED_PROTO === "1",
});
