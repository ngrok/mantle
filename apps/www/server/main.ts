// The server entry: `node server/main.ts build/server/index.js`.
import process from "node:process";

// Why a dynamic import: React reads `NODE_ENV` when it loads, and a static import runs first.
process.env.NODE_ENV ??= "production";
process.setSourceMapsEnabled(true);

const { start } = await import("./start.ts");
await start({ buildPath: process.argv[2] ?? "build/server/index.js" });
