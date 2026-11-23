# Screen reader check

These scripts drive a screen reader through the main flow of each component on the docs previews (`/preview/...`) and record what it says at each step. [flows.ts](./flows.ts) holds the flows. A step can list what a correct reader must say (`expect`) and what it must not say (`reject`). These patterns come from the ARIA pattern for the component, not from an earlier release.

## Readers

| Reader      | Where                        | Speed            | What it proves                                                                                                                                                                                                                                                                                                                    |
| ----------- | ---------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `virtual`   | Any OS, Playwright Chromium  | About 3 minutes  | Guidepup's virtual reader follows focus and live regions. For each step it also writes one `focus:` line from Chromium's accessibility tree: the focused item or its `aria-activedescendant`, its role, name, value, description, and states, and the named groups and dialogs around it. NVDA and JAWS read this tree in Chrome. |
| `voiceover` | macOS, Playwright WebKit     | About 20 minutes | Real VoiceOver output in the Safari engine.                                                                                                                                                                                                                                                                                       |
| `nvda`      | Windows, Playwright Chromium | About 20 minutes | Real NVDA output.                                                                                                                                                                                                                                                                                                                 |

VoiceOver and NVDA need the machine set up once with `npx @guidepup/setup setup`, then `npx @guidepup/setup install` from this package. The virtual reader cannot hear a name that comes from CSS generated content (ThemeSwitcher), and it reads label text as a stop of its own, so judge browse-mode reading on a real reader.

## Run

Build and serve the docs site, then run the flows and write a report:

```sh
pnpm exec turbo run build --filter=@app/www
(cd apps/www && PORT=4001 NODE_ENV=production pnpm exec app-server serve) &
node apps/www/screen-reader/run.ts --reader=virtual --base=http://localhost:4001/ --out=/tmp/head.json
node apps/www/screen-reader/report.ts --head=/tmp/head.json --base=apps/www/screen-reader/baseline.virtual.json
```

`--only=select,tabs` runs some flows. To compare two versions, serve each on its own port, run each, and pass both files to `report.ts`. A step whose speech changed is marked `Δ`.

## CI

[screen-reader.yml](../../../.github/workflows/screen-reader.yml) runs the virtual reader on each PR that touches a component or the docs site, and compares it with [baseline.virtual.json](./baseline.virtual.json). It runs NVDA and VoiceOver on the PR head and the last release on a weekly schedule, on a manual run, and on a PR with the `screen-reader` label. All jobs report only.

When a change to the spoken output is intended, update the baseline from a run of the virtual reader on the change. To make the check blocking, remove `continue-on-error` from the job and pass `--strict` to `report.ts`; it then exits 1 on an unmet expectation.
