# Yarn Resolutions

This file documents every entry in the `resolutions` block of `package.json`. Each entry should answer three questions: **what is being pinned**, **why it exists**, and **when it can be removed**.

`package.json` doesn't allow comments, so this file is the only place that knowledge lives. **If you add or remove a resolution, update this file in the same commit**, and delete or rewrite anything the change makes untrue. Git history and PR descriptions already hold the story of how an entry got here; this file only needs to hold what is true of the tree today.

## Conventions

-   **`^` range or exact version? Ask what the number is asserting.**

    A **floor** ("never below this") takes a `^` range. Almost every security pin is a floor: it does not matter whether `axios` resolves to 1.18.1 or 1.19.0, only that it is not below 1.18.0. Newer is strictly better, so let it land.

    A **fixture** ("exactly this") takes an exact version, and only when something genuinely binds to that release. These are compatibility constraints, not security ones. `@types/react`, `@types/react-dom` and `i18next` are the fixtures in this file.

    The two failure modes mirror each other. An exact version where a floor belongs **decays**: an exact `axios` pin can accumulate advisories because no patch can ever be selected once one lands below it, and an exact `qs` pin can end up holding the tree _at_ a version a later advisory covers instead of above it — both have happened in this file. A `^` range where a fixture belongs **surprises**: a range on `i18next` would let an install move it off the API `@dhis2/d2-i18n` binds to and break app startup.

    In practice: is there a higher version that would also work? Use `^`. Does something bind to this exact release? Pin it, **and write the condition for unpinning it.** If that condition cannot be stated, it should have been a range.

-   **A floor has to name the version that fixes every advisory it covers.** Take the highest patched version on the line, not the first one found. `external-editor/tmp` has a high advisory fixed in 0.2.6 and another affecting exactly `>= 0.2.6, < 0.2.7`, so `^0.2.6` would admit a vulnerable release and the floor is `^0.2.7`.
-   **Removing a constraint is not the same as upgrading it away.** For a package no direct dependency requests, deleting the entry hands version selection back to the parents, and a parent may be the reason the old version was there. `axios`, `qs` and `lodash` all resolve _downwards_ if their entries are removed, because `@eyeseetea/d2-api` and `@eyeseetea/d2-ui-components` request older exact versions. A floor is still a resolution; it just needs to be a range.
-   Prefer **per-parent** paths (`parent/child`) over standalone descriptors. Yarn-berry only matches a standalone descriptor on exact text: `picomatch@npm:^4` will _not_ match a child request of `^4.0.2`. The reliable forms are `parent/child` and `parent@npm:<exact-version>/child`.
-   **The version in a versioned-parent path is the _resolved_ version, not a descriptor.** `execa@npm:0.7.0/cross-spawn` binds because `execa@0.7.0` is what `yarn why execa -R` actually reports as installed, not because any consumer requests that version as a range. Key it off what `yarn why <parent> -R` shows, never off a descriptor.
-   **A versioned-parent path can select a version outside the range the parent declares.** `execa@npm:0.7.0/cross-spawn: ^6.0.6` resolves `cross-spawn` to 6.0.6 although `execa@0.7.0` itself declares `^5.0.1`. What decides between the two path forms is what else shares the parent's name: a parent-name path (`execa/cross-spawn`) would bind every `execa` in the tree, and this one also has `execa@5.1.1`, which declares `^7.0.3` and would be dragged below its own range by a global pin. The versioned-parent form keeps the lift scoped to the one copy that needs it.
-   **Versioned-parent pins go stale silently.** When the parent moves to another version, `parent@npm:<exact>/child` matches nothing and yarn does not warn. `execa@npm:0.7.0/cross-spawn` is the one entry of that shape in this file; re-check it at every audit.
-   **Test a constraint by removing it, re-installing and comparing the _resolved versions_**, not the lockfile bytes. A constraint can rewrite a descriptor, change the lockfile, and leave every installed version exactly where it was.
-   **When a returning version looks alarming, check the advisory's range before keeping the pin.** An older version coming back is not by itself a reason to keep a constraint: if removing a `glob-parent` entry returned `3.1.0`, and `GHSA-ww39-953v-wcq6` affects `>= 4.0.0, < 5.1.2`, the version that returned was never in range and the entry was protecting nothing.
-   **Validate the control before trusting a zero from the advisories API.** `gh api "advisories?ecosystem=npm&affects=<pkg>@<version>"` returns nothing both for a clean version and for one that was never published. A version that looks like a known-vulnerable control and returns nothing may simply not exist.
-   **A pin that clears the scanner but breaks a consumer is not a fix, and loading the consumer is not enough to tell.** Call the code path that uses the package. `package-json/got: ^11.8.5` loaded cleanly and failed on the first request; see "Rejected pins" below.
-   **Prefer re-resolution to a new constraint.** Most transitive findings are a stale lockfile rather than a missing fix: the parent's declared range already admits the patched release, and `yarn up -R <package>` reaches it with no manifest change. Reach for a resolution only once that has been shown to fail, and after checking whether a newer release of the parent already selects a patched version.

## Audit cadence

Re-audit the dependency tree monthly, before every release, and again immediately before requesting review on a change that claims a clean gate. Run it over the whole tree (`yarn npm audit --recursive`), not only the packages named in this file. Each entry below has a **drop when** condition; when that condition becomes true, delete the entry and re-install.

Note that `yarn npm audit` and the Dependency-Track analysis score against different advisory sources and disagree: `uuid` is high in Dependency-Track and medium upstream, and Dependency-Track keeps reporting some advisories GitHub has withdrawn (currently `esbuild`'s `GHSA-gv7w-rqvm-qjhr` and `eslint`'s `GHSA-p5wg-g6qr-c7cg` — dismiss both in code scanning rather than acting on them). **The CI gate follows Dependency-Track**, so measure there before concluding the tree is clean.

---

## Active resolutions

### Compatibility fixtures

#### `@types/react: 17.0.30` and `@types/react-dom: 17.0.9`

-   **Why:** Forces every transitive consumer onto the React 17 type definitions, so libraries that loosely peer on `@types/react` don't pull in React 18+ types and break the app's typecheck.
-   **Fixes:** Not security-related — typecheck stability only.
-   **Drop when:** The app migrates to React 18+, at which point these can be removed (or bumped to the matching major).

#### `i18next: 19.8.5`

-   **Why:** Held at the version `@dhis2/d2-i18n` expects, while overriding any older transitive request that would otherwise resolve to a vulnerable line.
-   **Fixes:** Prototype-pollution and buffer-overflow advisories in older i18next lines.
-   **Drop when:** `@dhis2/d2-i18n` updates to a version pulling a still-patched `i18next` natively, or the app migrates off `@dhis2/d2-i18n`. ⚠️ Holding here indefinitely is itself a risk — i18next 19 is EOL; revisit on the next `d2-i18n` bump.

#### `@dhis2/ui-icons: 7.4.1`

-   **Why not confirmed:** No recorded rationale beyond fixing a `yarn start`/`yarn build` failure. Likely holds `@dhis2/ui-icons` at a version matching `@dhis2/ui`'s peer requirement, but this is inference. Leave alone until confirmed; do not remove as an "undocumented pin" without checking `yarn why @dhis2/ui-icons` first.

### Security pins

Each pin below was verified against the tool or component that actually consumes the package, not only with `yarn install` — the ones reached through the build-only `@dhis2/cli-app-scripts` chain cross a major and were checked by loading and exercising their consumer.

#### `axios: ^1.18.0`

-   **Why:** Direct dependency; the resolution overrides transitive requests for an older axios and mirrors `dependencies.axios`. A range rather than an exact version, so patches land whenever the lockfile is re-resolved; it resolves to 1.18.1.
-   **Fixes:** CVE-2025-62718, CVE-2026-42033/-42035/-42038/-42039/-42043/-42044, GHSA-gcfj-64vw-6mp9 (high, Node HTTP adapter reusing an inherited proxy after interceptor changes) — and transitively clears `follow-redirects@1.15.11` (CVE-2026-40895).
-   **Runtime, not build-only.** Verified with the test suite and a production build.
-   **Drop when:** no transitive consumer requests `axios < 1.18.0`. `@eyeseetea/d2-api` requests an older exact version, so removing this entry resolves axios _downwards_. Verify with `yarn why axios`.

#### `qs: ^6.15.3`

-   **Why:** `@eyeseetea/d2-api` requests `qs` at an older exact version and `request` requests an old range; without the pin both resolve _downwards_ into the advisories below. It also binds `url` through the browser polyfills. `@eyeseetea/d2-api` makes it **runtime**, so changes to it are verified with the test suite and a production build. `qs` is called directly in `src/presentation/widget/pages/Root.tsx` and `src/presentation/react/core/hooks/useQueryParams.ts`.
-   **Fixes:** SNYK-JS-QS-14724253 (high), GHSA-q8mj-m7cp-5q26 and GHSA-4mjr-xmp4-gh2g (medium), GHSA-x5fp-wj9c-mxmx (low). The floor admits 6.16.0, which the lockfile resolves to; a lockfile held below that would not cover the last two.
-   **Drop when:** every consumer requests `qs >= 6.16.0` natively. `@eyeseetea/d2-api` is the blocker. Verify with `yarn why qs`.

#### `diff: ^5.2.2`

-   **Why:** Forces transitive `diff` consumers off a vulnerable older line. A range because a security floor should not be an exact version — 5.2.2 is currently the newest release on the 5.x line, so the range simply lets the next patch land unaided.
-   **Fixes:** SNYK-JS-DIFF-14917201 — ReDoS (medium).
-   **Drop when:** All parents pulling `diff` request `^5.2.0` or later natively. Verify with `yarn why diff`.

#### `lodash: ^4.18.0`

-   **Why:** `lodash` is a direct dependency, and the resolution forces every transitive consumer (DHIS2 libs, depcheck, ts-mockito, eslint-plugin-flowtype, i18next-scanner, etc.) onto the same line — without it, several parents stay on `4.17.21`, because `@eyeseetea/d2-api` and `@eyeseetea/d2-ui-components` request that exact version.
-   **Fixes:** CVE-2026-4800 (critical) and CVE-2021-23337 (high) — template-injection in `_.template`. Fix landed in lodash 4.18.0, the first lodash minor in over five years, cut to address these.
-   **Drop when:** Either every transitive parent natively requests `lodash@^4.18.0` or higher (verify with `yarn why lodash`), or the project removes the direct `lodash` dependency.

#### `flatted: ^3.4.2`

-   **Why:** `@vitest/ui`, `flat-cache` and `log4js` all pull `flatted@^3.x` ranges that include a vulnerable release. Forcing `^3.4.2` keeps every parent satisfied.
-   **Fixes:** CVE-2026-32141 and CVE-2026-33228 (both high).
-   **Drop when:** All three parents publish versions whose `flatted` range starts at `^3.4.0` or later. Verify with `yarn why flatted` — if every parent line shows `(via npm:^3.4.x)` or higher, the pin is redundant.

#### `tar: ^7.5.10`

-   **Why:** `node-gyp` requests a `tar` range that resolves to a vulnerable release without this pin.
-   **Fixes:** GHSA-qffp-2rhf-9h96 (high).
-   **Drop when:** `node-gyp` updates to a version requesting `tar@^7.5.10` or later.

#### `minimatch` per-parent (9 entries)

```jsonc
"@eslint/eslintrc/minimatch":                     "^3.1.4",
"@humanwhocodes/config-array/minimatch":          "^3.1.4",
"eslint/minimatch":                               "^3.1.4",
"eslint-plugin-import/minimatch":                 "^3.1.4",
"eslint-plugin-jsx-a11y/minimatch":               "^3.1.4",
"eslint-plugin-react/minimatch":                  "^3.1.4",
"multimatch/minimatch":                           "^3.1.4",
"depcheck/minimatch":                             "^7.4.8",
"@typescript-eslint/typescript-estree/minimatch": "^9.0.7"
```

-   **Why:** The dev-tool chain pulls minimatch in three vulnerable major lines (3.x via the eslint 8 ecosystem, 7.x via depcheck, 9.x via `@typescript-eslint` 6). The 10.x line (under `glob@13.0.6` / `cacache`) is already patched and untouched. Each pin is a patch-level bump within the parent's existing range: yarn resolves to `minimatch@3.1.5`, `7.4.9` and `9.0.9` respectively. All nine are parent-name pins, so they ride patch and minor bumps of their parents naturally; there is no versioned-parent entry of this shape in this file.
-   **Fixes:** CVE-2026-26996 / -27903 / -27904 (high each), all ReDoS-class. Dev-tool only — no runtime path.
-   **Drop when:** The dev toolchain moves past these majors. Concretely: **eslint 10** (`eslint@9.39.5` still declares `minimatch ^3.1.5` itself, and reaches the same line again through `@eslint/eslintrc@^3.3.6`; `eslint@10.8.0` is the first release that drops `@eslint/eslintrc` and moves to `minimatch ^10.2.5`), `@typescript-eslint` 8 (drops the 9.x line), and a depcheck release past 1.4.7 (drops the 7.x line). Reconsider on each of those upgrades.

#### `picomatch` per-parent (7 entries)

```jsonc
"@rollup/pluginutils/picomatch": "^4.0.4",
"tinyglobby/picomatch":          "^4.0.4",
"vite/picomatch":                "^4.0.4",
"vitest/picomatch":              "^4.0.4",
"micromatch/picomatch":          "^2.3.2",
"readdirp/picomatch":            "^2.3.2",
"anymatch/picomatch":            "^2.3.2"
```

-   **Why:** picomatch lives in two major lines in this tree (4.x via the rollup ecosystem, 2.x via the chokidar/micromatch ecosystem). A single global resolution would force one major onto parents that can't take it, and Yarn-berry doesn't support range-scoped descriptors (`picomatch@npm:^4` matches literally nothing), so each parent is pinned by name instead.
-   **Fixes:** GHSA-c2c7-rcm5-vvqj (CVE-2024-4067, CVE-2024-45296), high.
-   **Drop when:** Each named parent updates to a version that pulls a patched picomatch on its own. Check with `yarn why picomatch`.

#### `styled-jsx/loader-utils: ^1.4.2`

-   **Why:** `styled-jsx@4.0.1` (pulled by `@dhis2/app-shell` and `@dhis2/cli-app-scripts`) pins `loader-utils` at an exact vulnerable version. The scoped resolution overrides only `styled-jsx`'s request, leaving the separate `2.0.4` line (used by `babel-loader`, `file-loader`, `@pmmmwh/react-refresh-webpack-plugin`) untouched. Build-time only — no runtime surface.
-   **Fixes:** GHSA-76p3-8jx3-jpfq (critical), GHSA-3rfm-jhwj-7488 and GHSA-hhq3-ff78-jv3g (high).
-   **Drop when:** `styled-jsx` is upgraded to a version that either drops `loader-utils` or requests `^1.4.2` or later natively (or the DHIS2 app-shell chain migrates to a non-webpack CSS-in-JS approach). Verify with `yarn why loader-utils`.

#### `react-linkify/linkify-it: ^5.0.2`

-   **Why:** `react-linkify@1.0.0-alpha` requests `linkify-it@^2.0.3`, and the fix exists only on the 5.x line. `@eyeseetea/d2-ui-components` requests `react-linkify` at that exact version, so the parent cannot be moved either. Scoped to `react-linkify` so `markdown-it`'s own linkify-it is untouched. `react-linkify` is unmaintained and written against the linkify-it 2 API, so this was **checked rather than assumed**: linkify-it 5 still exports a callable CJS function, `.tlds()`, `.match()` and `.test()` behave the same, and rendering `<Linkify>` produces the expected `<a href>` for both URLs and `mailto:` addresses.
-   **Fixes:** GHSA-22p9-wv53-3rq4 and GHSA-v245-v573-v5vm (high) — quadratic-complexity DoS.
-   **Runtime.** `<Linkify>` is rendered by the store-creation pages.
-   **Drop when:** `@eyeseetea/d2-ui-components` drops `react-linkify` or moves to a release requesting a patched `linkify-it`.

#### `styled-components/postcss: ^8.5.18`

-   **Why:** `styled-components@6.1.8` requests `postcss` at an exact version, so no re-resolution can move it. Every other `postcss` consumer in the tree already requests a range that admits the patched line. Scoped to `styled-components` rather than applied globally. Verified by rendering a styled component through `ServerStyleSheet` and confirming the generated CSS still contains the declared properties and nested `:hover` rule, in addition to the test suite and a production build.
-   **Fixes:** GHSA-r28c-9q8g-f849 — path traversal in previous-source-map auto-loading; GHSA-6g55-p6wh-862q — arbitrary file read via attacker-controlled source map comments.
-   **Runtime.** `styled-components` is a direct dependency used throughout the presentation layer.
-   **Drop when:** `styled-components` requests a `postcss` range admitting 8.5.18 or later.

#### `external-editor/tmp: ^0.2.7`

-   **Why:** `external-editor@3.1.0` requests `tmp@^0.0.33`, which cannot reach the fix on the 0.2.x line. Reached through `@dhis2/cli-app-scripts` → `inquirer` → `external-editor`. The floor is 0.2.7 rather than 0.2.6 because a second advisory affects exactly `>= 0.2.6, < 0.2.7` — see the floor-versus-fixture convention above.
-   **Fixes:** GHSA-ph9p-34f9-6g65 (path traversal via unsanitized `prefix`/`postfix`) and GHSA-7c78-jf6q-g5cm, both high.
-   **Build/dev-tool chain only** — `external-editor` provides interactive prompt editing and is never bundled.
-   **Drop when:** `external-editor` requests `tmp@^0.2.7` or later, or the `inquirer` chain leaves the tree.

#### `isomorphic-fetch/node-fetch: ^2.6.7`

-   **Why:** `isomorphic-fetch@2.2.1` requests `node-fetch@^1.0.1`, and the fix for the 1.x line is on 2.6.7. Reached through `@eyeseetea/d2-ui-components` → `@dhis2/d2-ui-core` → `d2@31.7.0`, and again through `material-ui` → `recompose` → `fbjs`. Scoped to `isomorphic-fetch`; the separate `cross-fetch` path already requests a patched `node-fetch`. Verified rather than assumed, since it crosses a major: `isomorphic-fetch` loads against `node-fetch@2.7.0` and still installs a global `fetch`.
-   **Fixes:** GHSA-r683-j2x4-v87g — secure headers forwarded to untrusted sites across a cross-host redirect.
-   **Runtime**, through the legacy `d2` chain.
-   **Drop when:** the `d2@31.7.0` chain (an eviction candidate in its own right) is removed, or `isomorphic-fetch` requests a patched `node-fetch`.

#### `i18next-conv/node-gettext: ^3.0.1`

-   **Why:** `i18next-conv@9.2.1` requests `node-gettext@^2.0.0`, which resolves to a vulnerable release. Reached through `@dhis2/cli-app-scripts` → `i18next-conv`. ⚠️ **The advisory looks unfixable and is not.** GHSA-g974-hxvm-x689 records no patched version, so tooling that reads only that field reports it as a dead end, but its affected range is `<= 3.0.0` and 3.0.1 is published and outside it. Verified against the tool that consumes it: `yarn localize` extracts the same strings and produces no change to the generated `.pot` or the `.po` files beyond their timestamps.
-   **Fixes:** GHSA-g974-hxvm-x689 — prototype pollution.
-   **Build/dev-tool chain only** — `node-gettext` converts PO/POT files during i18n generation and is never bundled.
-   **Drop when:** `i18next-conv` requests `node-gettext@^3.0.1` or later natively, or drops it. Verify with `yarn why node-gettext`.

#### `@dhis2/cli-app-scripts/vite: ^6.4.3`

-   **Why:** `@dhis2/cli-app-scripts@12.11.1` bundles its own `vite` at `^5.2.9`, and there is no fix anywhere on the 5.x line; its bundled `esbuild` also sits inside a separate advisory. 6.4.3 is the lowest release that clears both and requests a patched esbuild. Scoped to `@dhis2/cli-app-scripts` because the application's own vite is on a different major and must not be moved by this entry. Verified by running the commands that actually use this package — `yarn localize` — which produces no content change beyond the generated file's timestamp.
-   **Fixes:** GHSA-fx2h-pf6j-xcff — `server.fs.deny` bypass via Windows alternate paths; GHSA-67mh-4wv8-2f99 against the bundled `esbuild`.
-   ⚠️ Dependency-Track may also report this vite's `esbuild` against `GHSA-gv7w-rqvm-qjhr` — withdrawn upstream, dismiss rather than remediate.
-   **Build/dev-tool chain only** — this vite instance serves the i18n commands and never builds the application.
-   **Drop when:** `@dhis2/cli-app-scripts` requests a vite range admitting 6.4.3 or later.

#### `@dhis2/cli-helpers-engine` chain: `http-proxy-agent/@tootallnate/once`, `request/tough-cookie`, `request/form-data`, `latest-version/package-json`, `execa@npm:0.7.0/cross-spawn`

-   `http-proxy-agent/@tootallnate/once: ^2.0.1` — `http-proxy-agent@4.0.1` requests `@tootallnate/once@1`; the fix for that line is 2.0.1. Reached through `@dhis2/cli-app-scripts` → `@jest/core` → `jest-environment-jsdom` → `jsdom@16`, the bundled jest this project does not run (its tests use vitest). **Fixes:** GHSA-vpq2-c234-7xj6 (low). Verified by instantiating an `HttpProxyAgent` against the 2.x package. **Drop when:** `http-proxy-agent` requests `@tootallnate/once@^2` or later, or the bundled jest chain leaves the tree.
-   `request/tough-cookie: ^4.1.3` — `request@2.88.2` requests `tough-cookie@~2.5.0`, which cannot reach the 4.x fix line. The separate `jsdom` path already resolves to a patched 4.x on its own. **Fixes:** GHSA-72xf-g2v4-qvf3 (medium). `request` is deprecated and written against the tough-cookie 2 API, so this was checked rather than assumed: with the patched version installed, `request.jar()` still creates a jar, `request.cookie()` parses, and `getCookieString` round-trips the value. **Drop when:** the `request` chain leaves the tree — same condition as the `uuid` and `request` findings below, and the one thing that would remove several entries at once.
-   `request/form-data: ^2.5.6` — `request@2.88.2` requests `form-data@~2.3.2`, which resolves to a vulnerable release; `request` has no later release, so its children are lifted directly. **Fixes:** GHSA-fjxv-7rqg-78g4 (critical) and GHSA-hmw2-7cc7-3qxx (high) — the floor has to clear both, and `^2.5.4` alone would still admit the range the second one covers. **Drop when:** the `request` chain leaves the tree. Verify with `yarn why form-data`.
-   `latest-version/package-json: ^7.0.0` — `update-notifier@3.0.1` → `latest-version@5.1.0` requests `package-json@^6.3.0`, which requests `got@^9.6.0`; the fix is on 11.8.5 and the range cannot reach it. `package-json@7.0.0` is still CommonJS and declares `got@^11.8.2` itself, so got 11 arrives through a parent written for it. **Fixes:** GHSA-pfrx-2q88-qq97 (medium). Verified by calling `latestVersion()` directly against the real registry, not only loading the module — the direct alternative, `package-json/got: ^11.8.5`, loads but breaks every call; see "Rejected pins". **Drop when:** `latest-version` requests `package-json >= 7` natively, or the `update-notifier` chain leaves the tree.
-   `execa@npm:0.7.0/cross-spawn: ^6.0.6` — `update-notifier@3.0.1` → `boxen@3.2.0` → `term-size@1.2.0` requests `execa@^0.7.0`, which requests `cross-spawn@^5.0.1`. GHSA-3xgq-45jj-v275 is patched at 6.0.6 and 7.0.5, nothing on 5.x. The versioned-parent form is required: `execa@5.1.1` is also in the tree (via the bundled jest chain) and declares `^7.0.3`, so a parent-name `execa/cross-spawn` entry would drag it below its own range. **Fixes:** GHSA-3xgq-45jj-v275 (high) — ReDoS in argument escaping. `term-size` only runs fixed commands (its own vendored binaries, `resize -u`, `tput cols`/`tput lines`); no external argument reaches `cross-spawn` on this path. Verified with `yarn why cross-spawn -R`: `execa@0.7.0` resolves `cross-spawn` to 6.0.6, and the unrelated `cross-spawn@7.0.6` copies (eslint, jest's `execa@5.1.1`, `archiver`'s `glob`) are untouched. **Drop when:** `term-size@1.x` leaves the tree, which happens when `@dhis2/cli-helpers-engine` moves off `update-notifier@3`.

All five above exist only because this project uses `@dhis2/cli-app-scripts` for exactly two scripts, `extract-pot` and `localize`. Replacing it would retire all five and the `uuid`/`request` findings below; that is a dependency decision, tracked outside this repository, not made here.

---

## Rejected pins

Tried, verified to break a consumer, and reverted. Recorded so nobody re-tries them.

| Pin attempted               | What broke |
| ---------------------------- | ---------- |
| `package-json/got: ^11.8.5` | Loads cleanly, then every lookup fails: `package-json@6.5.0` calls `got` with `{ json: true }`, which got 9 (what `package-json@6.5.0` was written against) reads as "parse the response" and got 11 reads as "send a JSON body" — `RequestError: The GET method cannot be used with a body`. Loading the module is not enough to catch this; it takes calling the code path that uses the package. Use `latest-version/package-json: ^7.0.0` instead, which lifts the parent to a release written for got 11. |

---

## Known findings with no fix available

Recorded here rather than in `resolutions` because **no version resolves them**. Check the [live code-scanning alerts][open-alerts] for the current count rather than this file — a number written here goes stale on the next scan.

[open-alerts]: https://github.com/EyeSeeTea/metadata-synchronization/security/code-scanning?query=is%3Aopen+branch%3Afix%2Fdependency-vulnerabilities+tool%3A%22OWASP+Dependency-Track+%28yarn4%29%22

⚠️ **The scanner's severity badge can sit a notch away from the advisory's own rating, in both directions.** `uuid` shows high against a GHSA that GitHub rates medium; `elliptic` shows medium against one rated low. Read the badge as the gate's number, not as the advisory's.

#### `uuid@3.4.0`: GHSA-w5hq-g745-h8pq

-   **Chain:** `@dhis2/cli-app-scripts` → `@dhis2/cli-helpers-engine` → `request@2.88.2` → `uuid@^3.3.2`.
-   **Not reachable in this tree.** The advisory is a missing bounds check in `v3()`, `v5()` and `v6()` when the caller supplies an output buffer. `request` imports only the `v4` subpath (`lib/auth.js`, `lib/multipart.js`, `lib/oauth.js`, each `require('uuid/v4')`), and all three call sites invoke it with no arguments. ⚠️ What makes this safe is the call sites, not the implementation: 3.4.0's `v4` does not carry the guard the advisory credits modern `v4` with either.
-   **Why it cannot be fixed:** the advisory patches this line at 11.1.1, but the `exports` map published with `uuid@11.1.1` declares only `.` and `./package.json` — the `uuid/v4` subpath was removed in v7. Forcing it fails at load with `ERR_PACKAGE_PATH_NOT_EXPORTED`, a broken build rather than a fix. `request` is deprecated and receives no releases, so the call site will not change upstream.
-   **Impact:** build/dev-tool chain only, never bundled into the application.
-   ⚠️ **A `yarn patch` would also work, deliberately not done.** Patching `request` to call `require('uuid').v4` instead of `require('uuid/v4')` would let `uuid` move to 11.1.1, since 11.x still ships a CJS entry point. That trades an alert on an unreachable, build-only path for a patch file against a package deprecated since 2020, re-checked on every install. Recorded so the option is a decision rather than an oversight.
-   **Revisit when:** `@dhis2/cli-helpers-engine` stops depending on `request`, or the `@dhis2/cli-app-scripts` chain is replaced — see the i18n tooling ticket.

#### `request@2.88.2`: GHSA-p8p7-x288-28g6

-   **Chain:** `@dhis2/cli-app-scripts` → `@dhis2/cli-helpers-engine` → `request@^2.88.0`.
-   **Why it cannot be fixed:** the advisory affects `<= 2.88.2` and records no patched version. 2.88.2 is the last release `request` has ever published and the package is deprecated, so there is nothing above the affected range to move to. The scoped resolutions on its children (`form-data`, `tough-cookie`) address those packages, not this one.
-   **Impact:** build/dev-tool chain only, never bundled.
-   **Revisit when:** `@dhis2/cli-helpers-engine` drops `request`, or the `@dhis2/cli-app-scripts` chain is replaced — same condition as `uuid` above; either closes both at once.

#### `elliptic@6.6.1`: GHSA-848j-6mx2-7j84

-   **Chain:** reached through the browser crypto polyfills, which exist because `md5.js` needs the `Buffer` shim.
-   **Why it cannot be fixed:** the advisory covers every published version (`<= 6.6.1`), and 6.6.1 is the latest release. Verified against the published version list rather than the patched-version field.
-   **Impact:** the ECDSA signing path is never reached.
-   **Revisit when:** a release above 6.6.1 is published, or `md5.js` is replaced and the polyfill chain leaves the tree entirely.

---

## Decay-monitoring checklist

When auditing, treat any of these as a signal that a resolution has gone stale:

-   A finding of **any severity** reappears for a package that has an active resolution. Do not filter this check to critical/high: a medium finding on a pinned package is exactly the kind that sits unnoticed below the gate's threshold.
-   `yarn why <pkg>` shows the resolved version _not matching_ the right-hand side of the resolution.
-   A versioned-parent pin (e.g. `parent@npm:1.2.3/child`) where `yarn why parent -R` shows no `1.2.3` entry — the pin is now a no-op and should be either re-pointed at the new parent version or removed.
-   **A floor below the highest patched version of its own advisories.** A new advisory can land on the floor itself, as `external-editor/tmp` shows. Re-read every advisory an entry lists when a new one appears for the same package.
-   **A pin whose removal changes nothing.** Delete it, re-install, and compare the resolved versions, not the lockfile bytes: if unchanged, the parent's own range already reaches a patched release and the entry is maintenance debt.
