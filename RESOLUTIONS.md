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
-   Prefer **per-parent** paths (`parent/child`) over standalone descriptors. Yarn-berry only matches a standalone descriptor on exact text — `picomatch@npm:^4` will _not_ match a child request of `^4.0.2`. The reliable forms are `parent/child`, `parent@npm:<exact-version>/child`, or `parent@npm:^<major>/child`.
-   **Versioned-parent pins go stale silently.** When `minimatch@10.2.4` becomes `10.2.5` in the tree, `minimatch@npm:10.2.4/brace-expansion` matches nothing and yarn does not warn. Mark any entry of that shape as a decay risk and re-check it at every audit.
-   **Prefer re-resolution to a new constraint.** Most transitive findings are a stale lockfile rather than a missing fix: the parent's declared range already admits the patched release, and `yarn up -R <package>` reaches it with no manifest change at all. Reach for a resolution only once that has been shown to fail.

## Audit cadence

Re-audit the dependency tree monthly, and before every release. A constraint that has silently stopped working shows up as a finding that keeps coming back for a package that already has one. Each entry below has a **drop when** condition — when that condition becomes true, delete the entry and re-install.

Note that a local `yarn npm audit` and the Dependency-Track analysis score against different advisory sources and will disagree. **The CI gate follows Dependency-Track**, so measure there before concluding the tree is clean.

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

#### `diff: 5.2.2`

-   **Why:** Forces transitive `diff` consumers off the vulnerable older line. Added in commit `73df6b5a`.
-   **Fixes:** SNYK-JS-DIFF-14917201 — ReDoS (Medium).
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

#### `request/form-data: ^2.5.4`

-   **Why:** `request@2.88.2` (deprecated, pulled by `@dhis2/cli-helpers-engine` under `@dhis2/cli-app-scripts`) requests `form-data@~2.3.2`, which resolves to the vulnerable `2.3.3`. All other `form-data` consumers in the tree (`@dhis2/cli-app-scripts` → `3.0.4`, `axios` → `4.0.5`, `jsdom` → `3.0.4`) are already on patched versions and are unaffected by this scoped pin. Build/dev-tool chain only — no runtime surface.
-   **Fixes:** CVE-2025-7783 / GHSA-fjxv-7rqg-78g4 (critical 9.0) — unsafe boundary random in `form-data < 2.5.4`.
-   **Drop when:** The `request` chain is removed (i.e., `@dhis2/cli-helpers-engine` drops `request` as a dependency) or `@dhis2/cli-app-scripts` is upgraded to a version that no longer pulls `request`. Verify with `yarn why form-data`.

### Security pins (added 2026-05-08)

#### `lodash: ^4.18.0`

-   **Why:** Direct dependency was bumped from `4.17.23` → `4.18.1`. The resolution forces every transitive consumer (DHIS2 libs, depcheck, ts-mockito, eslint-plugin-flowtype, i18next-scanner, etc.) onto the same line — without it, several parents stay on `4.17.21` and the CVEs persist.
-   **Fixes:** CVE-2026-4800 (critical 9.8) and CVE-2021-23337 (high 8.1) — both template-injection in `_.template`. Fix landed in lodash 4.18.0, the first lodash minor in 5+ years and explicitly cut to address these advisories.
-   **Drop when:** Either every transitive parent natively requests `lodash@^4.18.0` or higher (verify with `yarn why lodash`), or the project removes the direct `lodash` dep entirely.

#### `minimatch` per-parent (10 entries)

```jsonc
"@eslint/eslintrc/minimatch":                     "^3.1.4",
"@humanwhocodes/config-array/minimatch":          "^3.1.4",
"eslint/minimatch":                               "^3.1.4",
"eslint-plugin-import/minimatch":                 "^3.1.4",
"eslint-plugin-jsx-a11y/minimatch":               "^3.1.4",
"eslint-plugin-react/minimatch":                  "^3.1.4",
"multimatch/minimatch":                           "^3.1.4",
"glob@npm:7.2.3/minimatch":                       "^3.1.4",
"depcheck/minimatch":                             "^7.4.8",
"@typescript-eslint/typescript-estree/minimatch": "^9.0.7"
```

-   **Why:** The dev-tool chain pulls minimatch in three vulnerable major lines (3.x via the eslint-8 ecosystem, 7.x via depcheck, 9.x via @typescript-eslint 6). The 10.x line (under `glob@13.0.6` / `cacache`) is already patched and untouched. Each pin is a patch-level bump within the parent's existing range, so the fix is mechanical: yarn resolves to `minimatch@3.1.5`, `7.4.9`, `9.0.9` respectively. The `glob@npm:7.2.3` entry is versioned-parent because `glob` lives in two majors here (v7 wants `^3.1.x`, v13 wants `^10.2.x`); a parent-name pin would mis-route.
-   **Fixes:** CVE-2026-26996 / -27903 / -27904 (high 7.5 each), all ReDoS-class. Dev-tool only — no runtime path.
-   **⚠️ Decay risk:** `glob@npm:7.2.3/minimatch` is the one versioned-parent entry; if `glob` v7 ever bumps to 7.2.4 anywhere in the tree, that pin silently no-ops. The other 9 are parent-name pins and ride patch/minor bumps naturally.
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

#### `vite@npm:^4.0.0/rollup: ^3.30.0`

-   **Why:** The application's vite (`devDependencies.vite ^4.0.0` → `vite@4.5.14`) pulls rollup `^3.27.1`, which resolves to the vulnerable `3.29.5`. The vitest tree's vite 7 already gets `rollup@4.60.3` (past the v4 fix line of 4.59.0), so it does not need a pin. The `^4.0.0` parent path scopes this to vite 4.x only — without scoping, a global `rollup` resolution would also downgrade vite 7's rollup 4.
-   **Fixes:** GHSA-mw96-cpmx-2vgc (high 8.0).
-   **Drop when:** The application is upgraded to vite ≥ 5 (which pulls rollup 4 natively), at which point the pin becomes a no-op and should be removed. Tracked separately as the "vite 4 → 7 migration" PR.

#### `vitest/vite`, `vite-node/vite`, `@vitest/ui/vite: ^7.3.2`

-   **Why:** vitest@3.2.4 (and friends) request vite via the range `^5.0.0 || ^6.0.0 || ^7.0.0-0`, which resolves to the vulnerable `vite@7.1.2` without these pins. We do **not** want a global vite resolution because the application's own vite is at v4.
-   **Fixes:** CVE-2026-39363, CVE-2026-39364, GHSA-v2wj-q39q-566r — all high 7.5–8.0, dev-server-only.
-   **Drop when:** vitest is upgraded past `^3.2.4` to a version whose vite peer range starts at `^7.3.2` or later. (Note: vitest@4 requires vite@6+, which the app does not yet have — see "vite 4 → 7 migration" PR.)

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

#### `external-editor/tmp: ^0.2.6`

-   **Why:** `external-editor@3.1.0` requests `tmp@^0.0.33`, which cannot reach the fix on the 0.2.x line. Reached through `@dhis2/cli-app-scripts` → `inquirer` → `external-editor`. Scoped to the only consumer.
-   **Fixes:** GHSA-ph9p-34f9-6g65 (patched 0.2.6) — path traversal via unsanitized `prefix`/`postfix` allowing writes outside the temporary directory.
-   **Build/dev-tool chain only** — `external-editor` provides interactive prompt editing and is never bundled.
-   **Drop when:** `external-editor` requests `tmp@^0.2.6` or later, or the `inquirer` chain leaves the tree.

#### `isomorphic-fetch/node-fetch: ^2.6.7`

-   **Why:** `isomorphic-fetch@2.2.1` requests `node-fetch@^1.0.1`, and the fix for the 1.x line is on 2.6.7, so the range cannot reach it. Reached through `@eyeseetea/d2-ui-components` → `@dhis2/d2-ui-core` → `d2@31.7.0`, and again through `material-ui` → `recompose` → `fbjs`. Scoped to `isomorphic-fetch`; the separate `cross-fetch` path already requests a patched `node-fetch` and is untouched.
    This crosses a major, so it was verified rather than assumed: `isomorphic-fetch` loads against `node-fetch@2.7.0` and still installs a global `fetch`.
-   **Fixes:** GHSA-r683-j2x4-v87g (patched 2.6.7) — secure headers forwarded to untrusted sites across a cross-host redirect.
-   **Runtime**, through the legacy `d2` chain.
-   **Drop when:** the `d2@31.7.0` chain is removed — see _Future improvements_ — or `isomorphic-fetch` requests a patched `node-fetch`.

#### `@dhis2/cli-app-scripts/vite: ^6.4.3`

-   **Why:** `@dhis2/cli-app-scripts@12.11.1` bundles its own `vite` at `^5.2.9`. The advisory is patched at 6.4.3 and **there is no fix anywhere on the 5.x line**, so the range cannot reach it and the parent has no release that requests a patched vite. Scoped to `@dhis2/cli-app-scripts` because the application's own vite is on a different major and must not be moved by this entry.
    Verified by running the commands that actually use this package — `yarn localize`, which still extracts the same number of strings and produces no content change to the generated `.pot` beyond its timestamp.
-   **Fixes:** GHSA-fx2h-pf6j-xcff (patched 6.4.3) — `server.fs.deny` bypass via Windows alternate paths.
-   **Build/dev-tool chain only** — this vite instance serves the i18n commands and never builds the application.
-   **Drop when:** `@dhis2/cli-app-scripts` requests a vite range admitting 6.4.3 or later.

---

## Removed

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

## Known findings with no fix available

Recorded here rather than in `resolutions` because **no version resolves them**. None of these is a
constraint; they are states of the upstream package, or of the line this repository is on.

### `esbuild` — GHSA-gv7w-rqvm-qjhr

**This advisory was withdrawn on 2026-06-17.** It may still appear in scanner output, because
different databases pick up withdrawals at different times. It does not describe a real defect, and
the upgrade it appears to call for corrects nothing. It should be dismissed rather than remediated.

**Revisit when:** never — a withdrawn advisory is dismissed, not fixed. If it reappears after being
dismissed, check whether it has been re-published rather than assuming it is the same record.

### `vite@4.5.14` — GHSA-fx2h-pf6j-xcff, GHSA-c27g-q93r-2cwf

-   **Chain:** `devDependencies.vite` at `^4.0.0` — the application's own build tool, not a transitive path.
-   **Why it cannot be fixed on this line:** GHSA-fx2h-pf6j-xcff is patched at 6.4.3 for everything `<= 6.4.2`, and GHSA-c27g-q93r-2cwf at 5.4.9 for vite `<= 5.4.8`. **There is no patched release anywhere on the 4.x line**, so neither re-resolution nor a scoped resolution can reach one. The only remediation is moving the application to vite 6 or later.
-   **Impact:** build and dev-server tooling; neither advisory describes anything that reaches the production bundle. `server.fs.deny` and the launch-editor endpoint are dev-server surfaces.
-   **Why it is not done here:** a vite major upgrade changes the build configuration and needs its own testing, so bundling it into a dependency pass would turn that pass into a toolchain migration. Tracked separately as the "vite 4 → 7 migration" work, which also drops the `vite@npm:^4.0.0/rollup` entry above.
-   **Note for whoever picks it up:** the vite upgrade does **not** require moving off ESLint 8. The two are independent; check the coupling in your own tree before bundling a linter migration into it.
-   **Revisit when:** the vite migration is scheduled.

### `uuid@3.4.0` — GHSA-w5hq-g745-h8pq

-   **Chain:** `@dhis2/cli-app-scripts` → `@dhis2/cli-helpers-engine` → `request@2.88.2` → `uuid@^3.3.2`.
-   **Why it cannot be fixed:** the advisory patches the line `uuid` is on at 11.1.1, but `request` calls `require('uuid/v4')`, and that subpath was removed in uuid v7. **No published `uuid` release satisfies both the advisory and the subpath `request` imports**, so the finding cannot be re-resolved, scoped or upgraded away. Forcing the patched version fails at load time with `ERR_PACKAGE_PATH_NOT_EXPORTED`. `request` has been deprecated since 2020 and receives no releases, so the call site will not change upstream.
-   **Impact:** build/dev-tool chain only. `request` is reached through the i18n commands and is never bundled into the application.
-   **Revisit when:** `@dhis2/cli-helpers-engine` stops depending on `request`. That is the single condition that removes this path, and it is upstream — nobody on this project controls it.

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
-   **Upgrade the application off vite 4**, which clears two findings with no fix on the current line and drops the `vite@npm:^4.0.0/rollup` entry.
-   **Fix `@eyeseetea/d2-api` and `@eyeseetea/d2-ui-components` upstream.** Between them they request `axios`, `qs`, `lodash` and `react-linkify` at exact versions, which is what forces four of the entries in this file into every application that uses them.
