# Yarn Resolutions

This file documents every entry in the `resolutions` block of `package.json`. Each entry should answer three questions: **what is being pinned**, **why it exists**, and **when it can be removed**.

`package.json` doesn't allow comments, so this file is the only place that knowledge lives. **If you add or remove a resolution, update this file in the same commit.**

## Conventions

-   **`^` range or exact version? Ask what the number is asserting.**

    A **floor** — "never below this" — takes a `^` range. Almost every security constraint is a floor: it does not matter whether `axios` resolves to 1.18.1 or 1.19.0, only that it is not 1.16.0. Newer is strictly better, so let it land.

    A **fixture** — "exactly this" — takes an exact version, and only when something genuinely binds to that release. These are compatibility constraints, not security ones. `@types/react`, `@types/react-dom` and `i18next` are the fixtures in this file.

    The two failure modes mirror each other, and this repository has now hit both. An exact version where a floor belonged **decays**: `axios: 1.16.0` was correct when written and became the finding it was added to fix, because no patch could ever be selected. Decay has a nastier form still — `qs: 6.14.2` was written to fix an advisory, a later advisory landed on 6.14.2 itself, and the constraint ended up holding the whole tree _at_ the vulnerable version rather than above it.

    In practice: is there a higher version that would also work? Use `^`. Does something bind to this exact release? Pin it — **and write the condition for unpinning it.** If that condition cannot be stated, it should have been a range.

-   **Removing a constraint is not the same as upgrading.** For a package no direct dependency requests, deleting the entry hands version selection back to the parents, and a parent may be the reason the old version was there. `axios`, `qs` and `lodash` all resolve _downwards_ if their entries are removed, because `@eyeseetea/d2-api` and `@eyeseetea/d2-ui-components` request older exact versions. A floor is still a resolution; it just needs to be a range.
-   Prefer **per-parent** paths (`parent/child`) over standalone descriptors. Yarn-berry only matches a standalone descriptor on exact text — `picomatch@npm:^4` will _not_ match a child request of `^4.0.2`. The reliable forms are `parent/child` and `parent@npm:<exact-version>/child`.
-   **The version in a versioned-parent path is the _resolved_ version, not a descriptor.** ⚠️ Corrected 2026-09-17 — this section previously said the opposite and cited `glob@npm:7.2.3/minimatch` as proof; see the note on that entry in [Removed](#removed). `execa@npm:0.7.0/cross-spawn: ^6.0.6` below is the live counter-example: `execa@0.7.0` is the resolved version `yarn why execa -R` reports, and the key binds on it — confirmed by `yarn install` reporting `+ cross-spawn@npm:6.0.6 / - cross-spawn@npm:5.1.0`. Key it off what `yarn why <parent> -R` shows as installed, not off a descriptor a consumer happens to request.
-   **A versioned-parent path *can* select a version outside the range the parent declares.** Also corrected 2026-09-17. `execa@npm:0.7.0/cross-spawn: ^6.0.6` resolves `cross-spawn` to 6.0.6 although `execa@0.7.0` itself declares `^5.0.1`. What decides between the two path forms is what else shares the parent's name: a parent-name path (`execa/cross-spawn`) would bind every `execa` in the tree, and this one also has `execa@5.1.1`, which declares `^7.0.3` and would be dragged below its own range by a global pin. The versioned-parent form keeps the lift scoped to the one copy that needs it — check what else shares the parent name before choosing between the two shapes.
-   **Versioned-parent pins go stale silently.** When the parent moves to another version, `parent@npm:<exact>/child` matches nothing and yarn does not warn. `execa@npm:0.7.0/cross-spawn` is the one entry of that shape in this file; re-check it at every audit.
-   **Test a constraint by removing it, re-installing and comparing the _resolved versions_** — not the lockfile bytes. A constraint can rewrite a descriptor, change the lockfile, and leave every installed version exactly where it was.
-   **When a returning version looks alarming, check the advisory's range before keeping the pin.** An older version coming back is not by itself a reason to keep a constraint. If removing a `glob-parent` entry returns `3.1.0`, note that `GHSA-ww39-953v-wcq6` affects `>= 4.0.0, < 5.1.2`: the version that returned was never in range, so the entry was protecting nothing.
-   **Validate the control before trusting a zero from the advisories API.** `gh api "advisories?ecosystem=npm&affects=<pkg>@<version>"` returns nothing both for a clean version and for one that was never published. `glob-parent@5.0.0` looks like a known-vulnerable control and returns nothing because it does not exist; `glob-parent@5.1.1` is a valid one.
-   **A constraint that clears the scanner but breaks a consumer is not a fix.** Verify against the tool that actually uses the package, not just `yarn install`.
-   **Prefer re-resolution to a new constraint.** Most transitive findings are a stale lockfile rather than a missing fix: the parent's declared range already admits the patched release, and `yarn up -R <package>` reaches it with no manifest change at all. Reach for a resolution only once that has been shown to fail.

## Audit cadence

Re-audit the dependency tree monthly, and before every release. A constraint that has silently stopped working shows up as a finding that keeps coming back for a package that already has one. Each entry below has a **drop when** condition — when that condition becomes true, delete the entry and re-install.

Note that a local `yarn npm audit` and the Dependency-Track analysis score against different advisory sources and will disagree. **The CI gate follows Dependency-Track**, so measure there before concluding the tree is clean.

**Date the claims that decay; never write down a count.** An advisory ID, a withdrawal date and a structural reason ("`request` imports `uuid/v4`, and 11.1.1 does not export that subpath") stay true and belong here. A number of open alerts does not: it is re-derivable from the scanner in seconds, it goes stale on the next scan, and this file has no way to notice. Where a claim _is_ about a state that can change — "6.6.1 is still `latest`" — record the date it was checked, so the next reader knows how much of it to trust rather than having to re-derive all of it.

---

## Active resolutions

### Pre-existing (rationale recovered from git history)

#### `@types/react: 17.0.30` and `@types/react-dom: 17.0.9`

-   **Why:** Forces every transitive consumer onto the React 17 type definitions, so libraries that loosely peer on `@types/react` don't pull in React 18+ types and break the app's typecheck. Introduced in commit `30a8c433` ("Force @types/react@17 so all dependencies use it").
-   **Fixes:** Not security-related — typecheck stability only.
-   **Drop when:** The app migrates to React 18+, at which point these can be removed (or bumped to the matching major).

#### `qs: ^6.15.3`

-   **Why:** Pinned alongside the direct `qs` dep to override any older transitive request. Originally added at `6.14.1` in commit `73df6b5a` ("Address Snyk-reported vulnerabilities") to clear a transitive `qs@6.9.7`; later bumped to `6.14.2`.
    ⚠️ **Converted from the exact version `6.14.2` to a range on 2026-08-05, because that exact version had itself become the vulnerable one.** GHSA-q8mj-m7cp-5q26 affects `>= 6.11.1, <= 6.15.1`, and 6.15.2 was published after the pin was written — so the pin was holding the whole tree _at_ the advisory rather than above it. A security constraint is a floor, and a floor takes a range.
-   **Fixes:** SNYK-JS-QS-14724253 — Allocation of Resources Without Limits (High) in transitive `qs@6.9.7`. GHSA-q8mj-m7cp-5q26 (medium) — unhandled `TypeError` in `qs.stringify` with `arrayFormat: 'comma'` and `encodeValuesOnly: true` over an array containing `null`.
-   **Runtime, not build-only.** `qs` is reached through `@eyeseetea/d2-api`, so this change was verified with the test suite and a production build rather than with `yarn install` alone.
-   **Drop when:** every consumer requests `qs >= 6.15.2` natively. `@eyeseetea/d2-api` is the blocker — it requests an older exact version, so removing this entry resolves `qs` _downwards_ rather than upwards. Verify with `yarn why qs`.

#### `diff: ^5.2.2`

-   **Why:** Forces transitive `diff` consumers off the vulnerable older line. Added in commit `73df6b5a`.
-   **Fixes:** SNYK-JS-DIFF-14917201 — ReDoS (Medium).
-   **Converted from the exact `5.2.2` to a range on 2026-08-12.** This is a security floor, and an exact version cannot receive a patch — the shape that turns a fix into the next finding. 5.2.2 is currently the newest release on the 5.x line, so the resolved version is unchanged today; the range simply lets the next 5.x patch land unaided.
-   **Drop when:** All parents pulling `diff` request `^5.2.0` or later natively. Verify with `yarn why diff`.

#### `i18next: 19.8.5`

-   **Why:** Held at the version `@dhis2/d2-i18n` expects, while overriding any older transitive request that would otherwise resolve to a vulnerable line. Added in commit `73df6b5a`.
-   **Fixes:** SNYK-JS-I18NEXT-1065979 (Prototype Pollution, High), -575536, -585930 (Buffer Overflow, Medium).
-   **Drop when:** `@dhis2/d2-i18n` updates to a version pulling a still-patched `i18next` natively, or the app migrates off `@dhis2/d2-i18n`. ⚠️ Holding at `19.8.5` indefinitely is itself risky — i18next 19 is EOL; revisit on next d2-i18n bump.

### Pre-existing (rationale not recovered)

| Pin                      | Notes                                                                                                                                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@dhis2/ui-icons: 7.4.1` | Added in commit `f31d19d3` ("Fix yarn start and build"); commit message gives no further detail. Likely held back to match `@dhis2/ui` peer requirements, but this is inference, not confirmed. Leave alone until someone with project history can confirm. |

### Security pins (added 2026-05-27)

#### `styled-jsx/loader-utils: ^1.4.2`

-   **Why:** `styled-jsx@4.0.1` (pulled by `@dhis2/app-shell` and `@dhis2/cli-app-scripts`) pins `loader-utils` at exactly `1.2.3`, which is vulnerable across six advisories. The scoped resolution overrides only `styled-jsx`'s request, leaving the separate `2.0.4` line (used by `babel-loader`, `file-loader`, `@pmmmwh/react-refresh-webpack-plugin`) untouched. Build-time only — no runtime surface.
-   **Fixes:** CVE-2022-37599 (high 7.5), CVE-2022-37601 (critical 9.8), CVE-2022-37603 (high 7.5), GHSA-76p3-8jx3-jpfq (critical 9.8, confirmed 1.x fixed at `1.4.1` per GitHub advisory API), GHSA-3rfm-jhwj-7488 (high 7.5), GHSA-hhq3-ff78-jv3g (high 7.5).
-   **Drop when:** `styled-jsx` is upgraded to a version that either drops `loader-utils` or requests `^1.4.2` or later natively (or the DHIS2 app-shell chain migrates to a non-webpack CSS-in-JS approach). Verify with `yarn why loader-utils`.

#### `request/form-data: ^2.5.6`

-   **Why:** `request@2.88.2` (deprecated, pulled by `@dhis2/cli-helpers-engine` under `@dhis2/cli-app-scripts`) requests `form-data@~2.3.2`, which resolves to the vulnerable `2.3.3`. All other `form-data` consumers in the tree (`@dhis2/cli-app-scripts` → `3.0.5`, `axios` → `4.0.6`, `jsdom` → `3.0.5`) are already on patched versions and are unaffected by this scoped pin. Build/dev-tool chain only — no runtime surface.
    ⚠️ **Raised from `^2.5.4` to `^2.5.6` on 2026-09-17**, matching the skeleton baseline: GHSA-hmw2-7cc7-3qxx (high) is fixed at 2.5.6 and `^2.5.4` would admit the vulnerable range below it. `request` has no later release, so its children are lifted directly — see [Conventions](#conventions).
-   **Fixes:** CVE-2025-7783 / GHSA-fjxv-7rqg-78g4 (critical 9.0) — unsafe boundary random in `form-data < 2.5.4`. GHSA-hmw2-7cc7-3qxx (high) — a second advisory patched at 2.5.6.
-   **Drop when:** The `request` chain is removed (i.e., `@dhis2/cli-helpers-engine` drops `request` as a dependency) or `@dhis2/cli-app-scripts` is upgraded to a version that no longer pulls `request`. Verify with `yarn why form-data`.

### Security pins (added 2026-05-08)

#### `lodash: ^4.18.0`

-   **Why:** Direct dependency was bumped from `4.17.23` → `4.18.1`. The resolution forces every transitive consumer (DHIS2 libs, depcheck, ts-mockito, eslint-plugin-flowtype, i18next-scanner, etc.) onto the same line — without it, several parents stay on `4.17.21` and the CVEs persist.
-   **Fixes:** CVE-2026-4800 (critical 9.8) and CVE-2021-23337 (high 8.1) — both template-injection in `_.template`. Fix landed in lodash 4.18.0, the first lodash minor in 5+ years and explicitly cut to address these advisories.
-   **Drop when:** Either every transitive parent natively requests `lodash@^4.18.0` or higher (verify with `yarn why lodash`), or the project removes the direct `lodash` dep entirely.

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

-   **Why:** The dev-tool chain pulls minimatch in three vulnerable major lines (3.x via the eslint-8 ecosystem, 7.x via depcheck, 9.x via @typescript-eslint 6). The 10.x line (under `glob@13.0.6` / `cacache`) is already patched and untouched. Each pin is a patch-level bump within the parent's existing range, so the fix is mechanical: yarn resolves to `minimatch@3.1.5`, `7.4.9`, `9.0.9` respectively.
-   **Fixes:** CVE-2026-26996 / -27903 / -27904 (high 7.5 each), all ReDoS-class. Dev-tool only — no runtime path.
-   **All nine are parent-name pins** and ride patch and minor bumps of their parents naturally. There is no versioned-parent entry left in this file; the one that existed, `glob@npm:7.2.3/minimatch`, never matched anything — see [Removed](#removed).
-   **Drop when:** The dev toolchain is upgraded past these majors — concretely **eslint 10** (drops the minimatch 3.x chain), `@typescript-eslint` 8 (drops the 9.x line), and a depcheck bump past 1.4.7 (drops the 7.x line). Reconsider on each of those upgrades.
-   **⚠️ Corrected 2026-08-05: it is eslint 10, not eslint 9.** This entry previously named eslint 9 as the condition, and that is not true — `eslint@9.39.5` still declares `minimatch ^3.1.5` itself, and reaches the same line again through `@eslint/eslintrc@^3.3.6`, which also declares `^3.1.5`. `eslint@10.8.0` is the first release that drops `@eslint/eslintrc` and moves to `minimatch ^10.2.5`. Upgrading to eslint 9 would leave every one of these entries load-bearing, so anyone acting on the old condition would have removed them and reintroduced the finding. Verified against the published package metadata, not inferred.

### Security pins (added 2026-05-06)

#### `axios: ^1.18.0`

-   **Why:** Direct dependency. The resolution overrides transitive requests for an older axios and mirrors `dependencies.axios`.
    ⚠️ **Converted from the exact version `1.16.0` to a range on 2026-08-05.** `1.16.0` was correct when it was written, but GHSA-gcfj-64vw-6mp9 was published later affecting `>= 1.15.2, < 1.18.0` — and because the constraint was an exact version, no patch could ever be selected and the tree stayed on the vulnerable release. This is the decay mode an exact version has and a range does not: the pin added to fix a vulnerability became one. Resolves to 1.18.1.
-   **Fixes:** CVE-2025-62718, CVE-2026-42033, CVE-2026-42035, CVE-2026-42038, CVE-2026-42039, CVE-2026-42043, CVE-2026-42044 — and transitively cleared `follow-redirects@1.15.11` (CVE-2026-40895). GHSA-gcfj-64vw-6mp9 (high) — the Node HTTP adapter can use an inherited proxy after interceptor changes.
-   **Runtime, not build-only.** Verified with the test suite and a production build.
-   **Drop when:** no transitive consumer requests `axios < 1.18.0`. `@eyeseetea/d2-api` requests an older exact version, so removing this entry resolves axios _downwards_; keep it until that is no longer true. Verify with `yarn why axios`.

#### `flatted: ^3.4.2`

-   **Why:** `@vitest/ui`, `flat-cache`, `log4js` all pull `flatted@^3.x` ranges that include the vulnerable `3.3.3`. Forcing `^3.4.2` keeps every parent satisfied.
-   **Fixes:** CVE-2026-32141 (high 7.5), GHSA-25h7-pfq9-p65f / CVE-2026-33228 (high 7.5).
-   **Drop when:** All three parents publish new versions whose `flatted` range starts at `^3.4.0` or later. Verify with `yarn why flatted` — if every parent line shows `(via npm:^3.4.x)` or higher, the pin is redundant.

#### `tar: ^7.5.10`

-   **Why:** `node-gyp@12.2.0` requests `tar@^7.5.4`, which resolves to the vulnerable `7.5.9` without this pin.
-   **Fixes:** GHSA-qffp-2rhf-9h96 (high 8.0).
-   **Drop when:** `node-gyp` updates to a version requesting `tar@^7.5.10` or later.

#### `picomatch` per-parent (5 entries)

```jsonc
"@rollup/pluginutils/picomatch": "^4.0.4",
"tinyglobby/picomatch":          "^4.0.4",
"vite/picomatch":                "^4.0.4",
"vitest/picomatch":              "^4.0.4",
"micromatch/picomatch":          "^2.3.2",
"readdirp/picomatch":            "^2.3.2",
"anymatch/picomatch":            "^2.3.2"
```

-   **Why:** picomatch lives in two major lines in this tree (4.x via the rollup ecosystem, 2.x via the chokidar/micromatch ecosystem). A single global resolution would force one major onto parents that can't take it. Yarn-berry doesn't support range-scoped descriptors (`picomatch@npm:^4` matches literally nothing), so we resolve per-parent-name instead, which is name-stable and version-agnostic. The `vite/picomatch` and `vitest/picomatch` entries were added 2026-05-08 after BOM analysis showed `vite@7.3.2` and `vitest@3.2.4` were pulling `picomatch@4.0.3` directly — neither was covered by the original `@rollup/pluginutils` and `tinyglobby` parent paths.
-   **Fixes:** GHSA-c2c7-rcm5-vvqj (CVE-2024-4067, CVE-2024-45296), high 7.5.
-   **Drop when:** Each named parent updates to a version that pulls a patched picomatch on its own. Check with `yarn why picomatch`.

_(The `minimatch@npm:10.2.4/brace-expansion` entry that used to sit here was removed on 2026-08-05 — see [Removed](#removed).)_

_(The `vite@npm:^4.0.0/rollup` entry and the `vitest/vite`, `vite-node/vite`, `@vitest/ui/vite` trio that used to sit here were removed on 2026-08-13 with the vite upgrade — see [Removed](#removed).)_

### Security pins (added 2026-08-05)

Each of these was verified against the tool or component that actually consumes the package, not only
with `yarn install`.

#### `react-linkify/linkify-it: ^5.0.2`

-   **Why:** `react-linkify@1.0.0-alpha` requests `linkify-it@^2.0.3`, and the fix exists only on the 5.x line, so the range cannot reach it. `react-linkify` is requested at the exact version `1.0.0-alpha` by `@eyeseetea/d2-ui-components`, so the parent cannot be moved either. Scoped to that parent so any other `linkify-it` consumer is untouched.
    `react-linkify` is unmaintained and written against the linkify-it 2 API, so this was **checked rather than assumed**: `linkify-it@5.0.2` still exports a callable CJS function, and `.tlds()`, `.match()` and `.test()` behave the same. Rendering `<Linkify>` produces the expected `<a href>` for both URLs and `mailto:` addresses.
-   **Fixes:** GHSA-22p9-wv53-3rq4 (patched 5.0.1) and GHSA-v245-v573-v5vm (patched 5.0.2) — quadratic-complexity DoS in the scan loop and the `mailto:` validator.
-   **Runtime.** `<Linkify>` is rendered by the store-creation pages.
-   **Drop when:** `@eyeseetea/d2-ui-components` drops `react-linkify` or moves to a release requesting a patched `linkify-it`.

#### `styled-components/postcss: ^8.5.18`

-   **Why:** `styled-components@6.1.8` requests `postcss` at the exact version `8.4.31`, so no re-resolution can move it. Every other `postcss` consumer in the tree already requests a range that admits the patched line and is unaffected. Scoped to `styled-components` rather than applied globally.
    Verified by rendering a styled component through `ServerStyleSheet` and confirming the generated CSS still contains the declared properties and nested `:hover` rule, in addition to the test suite and a production build.
-   **Fixes:** GHSA-r28c-9q8g-f849 (patched 8.5.18) — path traversal in previous-source-map auto-loading; GHSA-6g55-p6wh-862q (patched 8.5.12) — arbitrary file read via attacker-controlled source map comments.
-   **Runtime.** `styled-components` is a direct dependency used throughout the presentation layer.
-   **Drop when:** `styled-components` requests a `postcss` range admitting 8.5.18 or later.

#### `external-editor/tmp: ^0.2.7`

-   **Why:** `external-editor@3.1.0` requests `tmp@^0.0.33`, which cannot reach the fix on the 0.2.x line. Reached through `@dhis2/cli-app-scripts` → `inquirer` → `external-editor`. Scoped to the only consumer.
    ⚠️ **Raised from `^0.2.6` to `^0.2.7` on 2026-09-17**, matching the skeleton baseline. GHSA-7c78-jf6q-g5cm affects exactly `>= 0.2.6, < 0.2.7`, so the floor that fixed the first advisory was itself inside the range of a later one — the same decay shape the `qs` entry above describes. The tree already resolved to 0.2.7 before this change (the `^` range on a `0.x` version already admits patches within `0.2.x`), so this is a documentation correction more than a functional one; recorded so the floor states the version it actually needs rather than the version that happened to work.
-   **Fixes:** GHSA-ph9p-34f9-6g65 (patched 0.2.6) — path traversal via unsanitized `prefix`/`postfix` allowing writes outside the temporary directory. GHSA-7c78-jf6q-g5cm (high) — patched 0.2.7.
-   **Build/dev-tool chain only** — `external-editor` provides interactive prompt editing and is never bundled.
-   **Drop when:** `external-editor` requests `tmp@^0.2.7` or later, or the `inquirer` chain leaves the tree.

#### `isomorphic-fetch/node-fetch: ^2.6.7`

-   **Why:** `isomorphic-fetch@2.2.1` requests `node-fetch@^1.0.1`, and the fix for the 1.x line is on 2.6.7, so the range cannot reach it. Reached through `@eyeseetea/d2-ui-components` → `@dhis2/d2-ui-core` → `d2@31.7.0`, and again through `material-ui` → `recompose` → `fbjs`. Scoped to `isomorphic-fetch`; the separate `cross-fetch` path already requests a patched `node-fetch` and is untouched.
    This crosses a major, so it was verified rather than assumed: `isomorphic-fetch` loads against `node-fetch@2.7.0` and still installs a global `fetch`.
-   **Fixes:** GHSA-r683-j2x4-v87g (patched 2.6.7) — secure headers forwarded to untrusted sites across a cross-host redirect.
-   **Runtime**, through the legacy `d2` chain.
-   **Drop when:** the `d2@31.7.0` chain is removed — see _Future improvements_ — or `isomorphic-fetch` requests a patched `node-fetch`.

#### `i18next-conv/node-gettext: ^3.0.1`

-   **Why:** `i18next-conv@9.2.1` requests `node-gettext@^2.0.0`, which resolves to the vulnerable `2.1.0`. Reached through `@dhis2/cli-app-scripts` → `i18next-conv`. Scoped to that parent because it is the only consumer.
    ⚠️ **The advisory looks unfixable and is not.** GHSA-g974-hxvm-x689 records **no patched version at all**, so tooling that reads only that field reports it as a dead end — but its affected range is `<= 3.0.0`, and **3.0.1 is published and outside it**. Always compare the affected range against the published version list before concluding a finding cannot be fixed.
    This crosses a major, so it was verified against the tool that consumes it: `yarn localize` still extracts the same 840 strings and produces no change to the generated `.pot` or the `.po` files beyond their timestamps.
-   **Fixes:** GHSA-g974-hxvm-x689 — prototype pollution.
-   **Build/dev-tool chain only** — `node-gettext` converts PO/POT files during i18n generation and is never bundled.
-   **Severity note:** the Dependency-Track analysis scores this **medium** while a local `yarn npm audit` scores it high. It is fixed here regardless of which side of the gate's threshold it falls on, because a published fix exists.
-   **Drop when:** `i18next-conv` requests `node-gettext@^3.0.1` or later natively, or drops it. Verify with `yarn why node-gettext`.

#### `@dhis2/cli-app-scripts/vite: ^6.4.3`

-   **Why:** `@dhis2/cli-app-scripts@12.11.1` bundles its own `vite` at `^5.2.9`. The advisory is patched at 6.4.3 and **there is no fix anywhere on the 5.x line**, so the range cannot reach it and the parent has no release that requests a patched vite. Scoped to `@dhis2/cli-app-scripts` because the application's own vite is on a different major and must not be moved by this entry.
    Verified by running the commands that actually use this package — `yarn localize`, which still extracts the same number of strings and produces no content change to the generated `.pot` beyond its timestamp.
-   **Fixes:** GHSA-fx2h-pf6j-xcff (patched 6.4.3) — `server.fs.deny` bypass via Windows alternate paths.
-   **Build/dev-tool chain only** — this vite instance serves the i18n commands and never builds the application.
-   **Drop when:** `@dhis2/cli-app-scripts` requests a vite range admitting 6.4.3 or later.

### Medium and low severity (added 2026-08-05)

Most of the medium and low findings were cleared by re-resolution alone — `ajv` to 6.15.0, `bn.js` to 4.12.5 and 5.2.5, `yaml` to 1.10.3, and `@babel/core` onto a single 7.29.7 after its direct dependency was reopened from the exact `7.15.8` to `^7.29.6`. None of those needed an entry here. The three below did.

All three cross a major inside the `@dhis2/cli-app-scripts` chain, which is build-time only, so each was verified by loading the consumer and exercising it rather than by `yarn install` alone.

#### `http-proxy-agent/@tootallnate/once: ^2.0.1`

-   **Why:** `http-proxy-agent@4.0.1` requests `@tootallnate/once@1`, and the fix for that line is on 2.0.1, so the range cannot reach it. Reached through `@dhis2/cli-app-scripts` → `@jest/core` → `jest-environment-jsdom` → `jsdom@16`. Scoped to the only consumer.
    Verified by instantiating an `HttpProxyAgent` against the 2.x package.
-   **Fixes:** GHSA-vpq2-c234-7xj6 (low) — incorrect control-flow scoping.
-   **Build/dev-tool chain only.** This `jsdom` belongs to the bundled jest, which this project does not run — its tests use vitest.
-   **Drop when:** `http-proxy-agent` requests `@tootallnate/once@^2` or later, or the bundled jest chain leaves the tree.

#### `request/tough-cookie: ^4.1.3`

-   **Why:** `request@2.88.2` requests `tough-cookie@~2.5.0`, which cannot reach the 4.x fix line. The separate `jsdom` path already resolves to a patched 4.x on its own and is unaffected. Scoped to `request`.
    ⚠️ `request` is deprecated and written against the tough-cookie 2 API, so this was checked rather than assumed: with 4.1.4 installed, `request.jar()` still creates a jar, `request.cookie()` parses, and `getCookieString` round-trips the value.
-   **Fixes:** GHSA-72xf-g2v4-qvf3 (medium) — prototype pollution.
-   **Build/dev-tool chain only** — `request` is reached through `@dhis2/cli-helpers-engine` and never bundled.
-   **Drop when:** the `request` chain leaves the tree. That is the same condition as the `uuid` finding below, and it is the one thing that would remove several entries at once.

#### `latest-version/package-json: ^7.0.0`

-   ⚠️ **Replaces the `package-json/got: ^11.8.5` pin, retired 2026-09-17.** That pin loaded cleanly — which is what the previous verification checked — but was never exercised end to end. See "Rejected pins" below.
-   **Why:** `@dhis2/cli-helpers-engine` → `update-notifier@3.0.1` → `latest-version@5.1.0` requests `package-json@^6.3.0`, which requests `got@^9.6.0`; the fix for that line is on 11.8.5 and the range cannot reach it. `package-json@7.0.0` is still CommonJS and declares `got@^11.8.2` itself, so got 11 arrives through a parent written for it rather than a pin on its child. Reached through `@dhis2/cli-app-scripts` → `@dhis2/cli-helpers-engine` → `update-notifier` → `latest-version` → `package-json`. Scoped to the only consumer.
    Verified by calling `latestVersion('is-number')` directly against the real registry — what `update-notifier` actually invokes — rather than only loading the module; it returned `7.0.0`.
-   **Fixes:** GHSA-pfrx-2q88-qq97 (medium) — redirect to a UNIX socket.
-   **Build/dev-tool chain only** — `update-notifier` checks for new releases of the CLI during i18n commands.
-   **Drop when:** `latest-version` requests `package-json >= 7` natively, or the `update-notifier` chain leaves the tree.

### High severity (added 2026-09-17)

#### `execa@npm:0.7.0/cross-spawn: ^6.0.6`

-   ⚠️ **Previously recorded as an accepted finding with no fix; that was wrong.** See the corrected conventions above — a versioned-parent path can select outside the range its parent declares, keyed on the parent's resolved version rather than a descriptor.
-   **Why:** `@dhis2/cli-helpers-engine` → `update-notifier@3.0.1` → `boxen@3.2.0` → `term-size@1.2.0` requests `execa@^0.7.0`, which requests `cross-spawn@^5.0.1`. GHSA-3xgq-45jj-v275 is patched at 6.0.6 and 7.0.5, nothing on 5.x. The versioned-parent form is required: `execa@5.1.1` is also in the tree (via the bundled jest chain) and declares `^7.0.3`, so a parent-name `execa/cross-spawn` entry would drag it below its own range.
    Verified with `yarn install` (`+ cross-spawn@npm:6.0.6 / - cross-spawn@npm:5.1.0`) and `yarn why cross-spawn -R`, which shows `execa@0.7.0` now resolving `cross-spawn` to 6.0.6 while the unrelated `cross-spawn@7.0.6` copies (eslint, jest's `execa@5.1.1`, `archiver`'s `glob`) are untouched.
-   **Fixes:** GHSA-3xgq-45jj-v275 (high) — ReDoS in argument escaping.
-   **Build/dev-tool chain only** — `term-size` runs only fixed commands (its own vendored binaries, `resize -u`, `tput cols`/`tput lines`); no external argument reaches `cross-spawn` on this path, so the fix closes the finding without there having been a reachable input to begin with.
-   ⚠️ **Decay risk: keyed on the resolved version.** 0.7.0 is the only 0.7.x release `execa` ever published, so the key cannot go stale through a parent patch bump the way most versioned-parent pins can — but re-check it at every audit regardless.
-   **Drop when:** `term-size@1.x` leaves the tree, which happens when `@dhis2/cli-helpers-engine` moves off `update-notifier@3`. Same exit as the `uuid` and `request` findings above.

---

## Removed

### `vite@npm:^4.0.0/rollup: ^3.30.0` and the `vitest/vite` trio — removed 2026-08-13

All four went with the vite upgrade, and for two different reasons.

`vite@npm:^4.0.0/rollup` **can no longer match anything**: the application declares `vite ^7.3.6`, so
no `vite@npm:^4.0.0` descriptor exists in the lockfile. It was the one entry in this file that
depended on the application staying on vite 4.

`vitest/vite`, `vite-node/vite` and `@vitest/ui/vite: ^7.3.2` existed to lift the vitest tree onto a
patched vite while the application sat on vite 4. Now that the application itself requests `^7.3.6`,
those consumers resolve to 7.3.6 unaided. Tested by removing all four and re-installing: `vite` stays
at 6.4.3 and 7.3.6, `esbuild` at 0.25.11, 0.25.12 and 0.28.1, and `vitest` and `vite-node` do not
move. `rollup` and `postcss` pick up newer releases in the same re-resolution — 4.62.4 and 8.5.26 —
and neither is in a live advisory range.

⚠️ **`@dhis2/cli-app-scripts/vite: ^6.4.3` is not part of this and must stay.** Tested separately:
removing it drops that chain's vite to 5.4.21 and its esbuild to **0.21.5**, which is inside
`GHSA-67mh-4wv8-2f99`. It is the one vite entry still doing work.

**Restore any of the four only if** the application moves back below vite 7, or a consumer appears
that requests a vite the upgrade does not already satisfy.

### `glob@npm:7.2.3/minimatch: ^3.1.4` — removed 2026-08-12

⚠️ **The reasoning below is superseded.** It concluded the key "never matched anything" because a
versioned-parent path was believed to key on the descriptor. That convention was corrected on
2026-09-17 — see the entry in [Conventions](#conventions) — and `7.2.3` is in fact the resolved
version, so this key likely did bind. The removal decision itself still holds, for the independent
reason given below: `glob@7.2.3`'s own `^3.1.1` already reaches the same patched `minimatch`, so the
entry changed nothing whether or not it matched. Left unmeasured rather than re-derived, because the
entry is already gone and nothing currently depends on which explanation is correct.

**Superseded reasoning, kept for context:** the key names the descriptor `glob@npm:7.2.3`, and no consumer
requests that. The only glob 7 entry in the lockfile is:

```
"glob@npm:^7.1.1, glob@npm:^7.1.2, glob@npm:^7.1.3, glob@npm:^7.1.4":
  version: 7.2.3
```

`7.2.3` is the version yarn resolved to, not a range anyone asked for. Resolution keys match
descriptor text, so the entry was inert from the day it was written — the value was read off the
`version:` line instead of the descriptor line above it.

Verified by removing it and re-installing: no resolved version changes anywhere in the tree, and the
lockfile moves by a single line. `glob@7.2.3` gets `minimatch@3.1.5` through its own `^3.1.1`, which
already admits the patched release, so the entry was not needed either — this is the
re-resolution-first rule in the conventions, applied after the fact.

The intent behind it was sound: `glob` lives in two majors here, v7 on the 3.x line and v13 on 10.x,
and a parent-name `glob/minimatch` pin would have dragged v13 down seven majors. That reasoning still
holds; it simply was not needed, because v7 reaches its own patch unaided.

**Restore it only if** a glob 7 consumer appears whose declared range cannot reach a patched
`minimatch` 3.x — and if so, key it on the resolved version `yarn why glob -R` reports.

### `minimatch@npm:10.2.4/brace-expansion: ^5.0.5` — removed 2026-08-05

The entry still matched a descriptor, so it was not inert in the way a copied pin usually is — but it
**made no difference to the resolved version**, which is the test that matters.

`minimatch@10.2.4` requests `brace-expansion@^5.0.2` and `minimatch@10.2.5` requests `^5.0.5`. Both
ranges already admit every published patch on the 5.x line, so the tree resolves to the same
`brace-expansion` with or without the entry. Removing it, re-installing and comparing the lockfile
showed the resolved version unchanged; the only difference was that the `^5.0.2` descriptor is no
longer rewritten to `^5.0.5`.

It was written when the 5.x line had no backport available and the range genuinely could not reach a
fix. That is no longer the case, and it was the highest-decay-risk shape in this file — a
versioned-parent pin that silently stops matching when the parent patch-bumps. Re-resolution now does
the job unaided.

**Restore it only if** a future advisory affects a `brace-expansion` release that `^5.0.2` can still
select — that is, if re-resolution stops reaching a patched version on its own.

---

## Rejected pins

Tried, verified to break a consumer, and reverted. Recorded so nobody re-tries them.

| Pin attempted               | What broke                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package-json/got: ^11.8.5` | Loads cleanly, then every lookup fails: `package-json@6.5.0` calls `got` with `{ json: true }`, which got 9 (what `package-json@6.5.0` was written against) reads as "parse the response" and got 11 reads as "send a JSON body" — `RequestError: The GET method cannot be used with a body`. **Loading the module is not enough to catch this**; it takes calling the code path that uses the package. Verified on the skeleton baseline against this exact `package-json@6.5.0` + `got@11.8.6` combination (2026-09-17); the failure is a library-version mismatch inside `package-json`, not something specific to either tree. Use `latest-version/package-json: ^7.0.0` instead, which lifts the parent to a release written for got 11. |

---

## Known findings with no fix available

Recorded here rather than in `resolutions` because **no version resolves them**. None of these is a
constraint; they are states of the upstream package, or of the line this repository is on.

### Status and what to do

⚠️ **Do not read an alert count out of this file.** The [live query][open-alerts] is the authority on
how many are open, and any number written here is a snapshot that stops being true at the next scan —
this section carried a stale one for three days after the vite upgrade closed eight advisories. What
follows is the part that does not move that fast: which groups the open findings fall into, and what
each would cost to close.

[open-alerts]: https://github.com/EyeSeeTea/metadata-synchronization/security/code-scanning?query=is%3Aopen+branch%3Afix%2Fdependency-vulnerabilities+tool%3A%22OWASP+Dependency-Track+%28yarn4%29%22

Everything still open falls into three groups, and only one of them has nothing that can be done.

| Group                              | Action                                                              | Needs                 |
| ---------------------------------- | ------------------------------------------------------------------- | --------------------- |
| Withdrawn advisories               | Dismiss in code scanning as a false positive — nothing to remediate | A dismissal, no code  |
| The `@dhis2/cli-app-scripts` chain | Drop or replace the chain, or wait for upstream to drop `request`   | A dependency decision |
| `elliptic@6.6.1`                   | Nothing — every published version is affected                       | An upstream release   |

⚠️ **The scanner's severity badge can sit a notch away from the advisory's own rating, in both
directions.** `uuid` shows high against a GHSA that GitHub rates medium (CVSS 6.3); `elliptic` shows
medium against one rated low (CVSS 2.9). The alert body carries the upstream rating while the badge
does not, so the two contradict each other inside the same alert. Read the badge as the gate's number,
not as the advisory's, and do not size the work from it — every high-severity alert this branch reports
is either the withdrawn `esbuild` advisory or that medium-rated `uuid` one.

Read in order of cost:

1. **Dismissing the withdrawn alerts is the cheapest item and needs no commit.** They are
   `GHSA-gv7w-rqvm-qjhr` against `esbuild` and `GHSA-p5wg-g6qr-c7cg` against `eslint`; both advisories
   were withdrawn upstream. Dismiss them rather than acting on them — **do not upgrade either package
   on their account.**
2. **The `uuid` and `request` findings share one exit.** Both are reached only through
   `@dhis2/cli-app-scripts`, which this project uses for exactly two scripts (`extract-pot` and
   `localize`). Replacing it for i18n would close both and retire eight resolutions in this file; that
   is a real option and does not depend on upstream, unlike the "wait for `@dhis2/cli-helpers-engine`"
   route the individual entries describe. `cross-spawn@5.1.0` used to be a third finding on this same
   exit — closed 2026-09-17 by a versioned-parent resolution instead; see
   `execa@npm:0.7.0/cross-spawn` in [Active resolutions](#active-resolutions).
3. **`elliptic` is the only genuine dead end.** Re-verified 2026-08-14: 6.6.1 is still `latest` and the
   advisory covers every published version.

The vite 4 line was a fourth group and by far the largest. It is closed — see
[Resolved by the vite upgrade](#resolved-by-the-vite-upgrade--eight-advisories).

### `esbuild` — GHSA-gv7w-rqvm-qjhr

**This advisory was withdrawn on 2026-06-17.** It may still appear in scanner output, because
different databases pick up withdrawals at different times. It does not describe a real defect, and
the upgrade it appears to call for corrects nothing. It should be dismissed rather than remediated.

It produces **one alert per resolved `esbuild` in range**, currently 0.25.11 and 0.25.12. The tree
also carries `^0.27.0 || ^0.28.0` → 0.28.1, which is not flagged because the withdrawn advisory's
range stops at `< 0.28.1`. Nothing to do either way, but it explains why the alert count does not
match the number of `esbuild` entries in the lockfile.

⚠️ **This is why an advisory count and an alert count are different numbers.** Before the vite
upgrade it produced three alerts, the third against the `esbuild@0.18.20` that vite 4 pulled. That
one went with the upgrade, so the same single advisory now shows two.

**Revisit when:** never — a withdrawn advisory is dismissed, not fixed. If it reappears after being
dismissed, check whether it has been re-published rather than assuming it is the same record.

### Resolved by the vite upgrade — eight advisories

`vite@4.5.14` carried GHSA-fx2h-pf6j-xcff and GHSA-c27g-q93r-2cwf (high), GHSA-v6wh-96g9-6wx3,
GHSA-4w7w-66w2-5vf9 and GHSA-93m4-6634-74q7 (medium), and GHSA-g4jq-h2w9-997c and
GHSA-jqfw-vq24-v9c3 (low). The `esbuild@0.18.20` it pulled carried GHSA-67mh-4wv8-2f99. All eight are
closed by moving the application off vite 4.

The move is `vite ^4.0.0 → ^7.3.6`, `@vitejs/plugin-react ^4.0.0 → ^5.1.0`, and `vitest` and
`@vitest/ui` to `^3.2.7`. It needed no change to the build configuration and no change to any test.
The tree now holds vite 7.3.6 for the application and 6.4.3 for `@dhis2/cli-app-scripts`, with esbuild
at 0.25.11, 0.25.12 and 0.28.1 — none of them in a live advisory range.

⚠️ **The `esbuild` entry that used to be here recorded a scoped resolution that had no effect.** That
reasoning is preserved in the conventions as a rule, because the mechanism outlives this particular
finding: a versioned-parent path cannot select a version outside the range the parent declares.

⚠️ **`launch-editor` is named beside `vite` in GHSA-c27g-q93r-2cwf and GHSA-v6wh-96g9-6wx3.**
Constraining it looked like a way to close both without upgrading, and it was not — under vite 4 it
did not appear in the lockfile at all, because vite inlined it into `dist/node/chunks/`.

### `uuid@3.4.0` — GHSA-w5hq-g745-h8pq

-   **Chain:** `@dhis2/cli-app-scripts` → `@dhis2/cli-helpers-engine` → `request@2.88.2` → `uuid@^3.3.2`.
-   **Not reachable in this tree.** The advisory is a missing bounds check in `v3()`, `v5()` and `v6()` **when the caller supplies an output buffer**. `request` imports only the `v4` subpath — `lib/auth.js`, `lib/multipart.js` and `lib/oauth.js` each do `require('uuid/v4')` — and all three call sites invoke it with no arguments. The vulnerable functions are never imported, and no caller-provided buffer exists anywhere on the path. Checked against the installed package rather than inferred from the advisory text.
    ⚠️ **What makes this safe is the call sites, not the implementation.** 3.4.0's `v4` copies into `buf` with no bounds check either, so it does not carry the guard the advisory credits modern `v4` with. Anyone re-deriving this from the advisory alone would conclude `v4` is inherently safe here, and that is not what was verified.
-   **Why it cannot be fixed:** the advisory patches the line `uuid` is on at 11.1.1, but `request` calls `require('uuid/v4')`, and that subpath was removed in uuid v7. **No published `uuid` release satisfies both the advisory and the subpath `request` imports**, so the finding cannot be re-resolved, scoped or upgraded away. Forcing the patched version fails at load time with `ERR_PACKAGE_PATH_NOT_EXPORTED`. `request` has been deprecated since 2020 and receives no releases, so the call site will not change upstream.
-   **Impact:** build/dev-tool chain only. `request` is reached through the i18n commands and is never bundled into the application.
-   **Revisit when:** `@dhis2/cli-helpers-engine` stops depending on `request` — or sooner, if the `@dhis2/cli-app-scripts` chain is replaced. That chain is a devDependency serving exactly two scripts, `extract-pot` and `localize`; dropping it closes this finding and the `request` one below without waiting for anyone upstream. See _Future improvements_.
-   ⚠️ **A `yarn patch` would also work, and is deliberately not done.** Patching `request` to call `require('uuid').v4` instead of `require('uuid/v4')` would let `uuid` move to 11.1.1, since 11.x still ships a CJS entry point. That trades an alert on an unreachable, build-only path for a patch file against a package deprecated since 2020, which has to be re-checked on every install. Recorded so the option is a decision rather than an oversight.

-   **Advisories against this component:** **one** live against `uuid@3.4.0` — the entry above. A second, GHSA-qmq6-f8pr-cx5x, also matches this version but was withdrawn on 2026-05-05 as a duplicate of it, so scanner output may show two where only one is real.

### `request@2.88.2` — GHSA-p8p7-x288-28g6

-   **Chain:** `@dhis2/cli-app-scripts` → `@dhis2/cli-helpers-engine` → `request@^2.88.0`.
-   **Why it cannot be fixed:** the advisory affects `<= 2.88.2` and **records no patched version at all** — 2.88.2 is the last release `request` has ever published, and the package has been deprecated since 2020. Unlike the `node-gettext` case, where "no patched version recorded" turned out to mean the fix was simply not registered, here the published version list confirms it: there is nothing above the affected range to move to. Scoped resolutions on its children (`form-data`, `tough-cookie`) address those packages, not this one.
-   **Impact:** build/dev-tool chain only, never bundled.
-   **Revisit when:** `@dhis2/cli-helpers-engine` drops `request`, or the `@dhis2/cli-app-scripts` chain is replaced. Same condition as the `uuid` finding above — either change closes both at once, and the second one does not depend on upstream.

-   **Advisories against this component:** **one** live against `request@2.88.2` — the entry above. One other exists against the package and is patched below this version.

### `elliptic@6.6.1` — GHSA-848j-6mx2-7j84

-   **Chain:** reached through the browser crypto polyfills, which exist because `md5.js` needs the `Buffer` shim.
-   **Why it cannot be fixed:** the advisory covers **every published version** (`<= 6.6.1`), and 6.6.1 is the latest release. There is no version to move to and no range that avoids it — verified against the published version list rather than the patched-version field, re-checked 2026-08-14.
-   **Revisit when:** a release above 6.6.1 is published, or `md5.js` is replaced and the polyfill chain leaves the tree entirely.

-   **Advisories against this component:** **one** live — the entry above. Eight others exist against `elliptic` and are all patched at or below 6.6.1, including the critical GHSA-vjh7-7g9h-fjfh, which 6.6.1 is itself the fix for.

### `eslint@8.57.1` — GHSA-p5wg-g6qr-c7cg

-   **This advisory was withdrawn on 2026-02-03.** It may still appear in scanner output, because different databases pick up withdrawals at different times. It does not describe a real defect and should be dismissed rather than remediated — **do not upgrade `eslint` on account of it.**
-   It is reported at medium severity here, which is why it survived a first pass filtered to critical and high. Worth knowing that withdrawn advisories can sit below the gate's threshold and go unexamined for longer.

-   **Advisories against this component:** **none** live against `eslint@8.57.1`. The one above is withdrawn, and one other exists against the package, patched below this version.

---

## Decay-monitoring checklist

When auditing, treat any of these as a signal that a constraint has gone stale:

-   A finding of **any severity** reappears for a package that has an active resolution. Do not filter this check to critical/high — `qs` was pinned to the exact version that later became the vulnerable one, and that finding sat at medium while nothing was looking below the gate's threshold.
-   `yarn why <pkg>` shows the resolved version _not matching_ the right-hand side of the resolution.
-   A versioned-parent pin (e.g. `parent@npm:1.2.3/child`) where `yarn why parent` shows no `1.2.3` entry — the pin is now a no-op and should be either re-pointed at the new parent version or removed.
-   **A constraint whose removal changes nothing.** Delete it, re-install, and compare: if the resolved version is unchanged, the parent's own range already reaches a patched release and the entry is maintenance debt. This is what retired the `brace-expansion` entry above.

## Future improvements

-   Make the existing `dependency-track-yarn4` GitHub workflow **block** on severity ≥ high so a regression doesn't reach `development`.
-   Treat the `d2@31.7.0` chain (via `@dhis2/d2-ui-core`) as an **eviction candidate** rather than a pin-forever item. It still pulls packages with no upstream fix path, and it is the reason the `isomorphic-fetch/node-fetch` entry exists.
-   ~~**Upgrade the application off vite 4.**~~ Done on 2026-08-13 — see [Resolved by the vite upgrade](#resolved-by-the-vite-upgrade--eight-advisories). It went to 7.3.6 rather than the minimum 6.4.3, because `@dhis2/cli-app-scripts` already holds a vite 6 and keeping the application above it avoids a second constraint.
-   **Treat `@dhis2/cli-app-scripts` as an eviction candidate.** It is a devDependency used by exactly two scripts (`extract-pot`, `localize`), yet it is the sole path to the `uuid` and `request` findings and the reason **eight** entries in this file exist: `request/form-data`, `request/tough-cookie`, `external-editor/tmp`, `i18next-conv/node-gettext`, `@dhis2/cli-app-scripts/vite`, `http-proxy-agent/@tootallnate/once`, `latest-version/package-json` and `execa@npm:0.7.0/cross-spawn`. Replacing it for i18n generation would close both findings and retire all eight, without waiting on upstream. (`styled-jsx/loader-utils` is **not** in that list — `@dhis2/app-shell` pulls it too, so it would survive.)
-   **Fix `@eyeseetea/d2-api` and `@eyeseetea/d2-ui-components` upstream.** Between them they request `axios`, `qs`, `lodash` and `react-linkify` at exact versions, which is what forces four of the entries in this file into every application that uses them.
