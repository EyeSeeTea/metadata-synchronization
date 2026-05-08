# Yarn Resolutions

This file documents every entry in the `resolutions` block of `package.json`. Each entry should answer three questions: **what is being pinned**, **why it exists**, and **when it can be removed**.

`package.json` doesn't allow comments, so this file is the only place that knowledge lives. **If you add or remove a resolution, update this file in the same commit.**

## Conventions

- Use `^` ranges for `<package>: <range>` style pins so future patch/minor releases land naturally.
- Prefer **per-parent** paths (`parent/child`) over standalone descriptors. Yarn-berry only matches a standalone descriptor on exact text — `picomatch@npm:^4` will *not* match a child request of `^4.0.2`. The reliable forms are `parent/child`, `parent@npm:<exact-version>/child`, or `parent@npm:^<major>/child`.
- **Versioned-parent pins go stale silently.** When `minimatch@10.2.4` becomes `10.2.5` in the tree, `minimatch@npm:10.2.4/brace-expansion` matches nothing and yarn does not warn. Re-run `/sca-triage` periodically to catch this.

## Audit cadence

Run `/sca-triage` monthly or before every release. The classifier will surface any silently-broken resolution as a recurring high-severity finding. Each entry below has a **drop when** condition — when that condition becomes true, delete the entry and re-install.

---

## Active resolutions

### Pre-existing (rationale recovered from git history)

#### `@types/react: 17.0.30` and `@types/react-dom: 17.0.9`
- **Why:** Forces every transitive consumer onto the React 17 type definitions, so libraries that loosely peer on `@types/react` don't pull in React 18+ types and break the app's typecheck. Introduced in commit `30a8c433` ("Force @types/react@17 so all dependencies use it").
- **Fixes:** Not security-related — typecheck stability only.
- **Drop when:** The app migrates to React 18+, at which point these can be removed (or bumped to the matching major).

#### `qs: 6.14.2`
- **Why:** Pinned alongside the direct `qs` dep to override any older transitive request. Originally added at `6.14.1` in commit `73df6b5a` ("Address Snyk-reported vulnerabilities") to clear a transitive `qs@6.9.7`; later bumped to `6.14.2`.
- **Fixes:** SNYK-JS-QS-14724253 — Allocation of Resources Without Limits (High) in transitive `qs@6.9.7`.
- **Drop when:** No transitive consumer requests `qs < 6.14`. Verify with `yarn why qs`.

#### `diff: 5.2.2`
- **Why:** Forces transitive `diff` consumers off the vulnerable older line. Added in commit `73df6b5a`.
- **Fixes:** SNYK-JS-DIFF-14917201 — ReDoS (Medium).
- **Drop when:** All parents pulling `diff` request `^5.2.0` or later natively. Verify with `yarn why diff`.

#### `i18next: 19.8.5`
- **Why:** Held at the version `@dhis2/d2-i18n` expects, while overriding any older transitive request that would otherwise resolve to a vulnerable line. Added in commit `73df6b5a`.
- **Fixes:** SNYK-JS-I18NEXT-1065979 (Prototype Pollution, High), -575536, -585930 (Buffer Overflow, Medium).
- **Drop when:** `@dhis2/d2-i18n` updates to a version pulling a still-patched `i18next` natively, or the app migrates off `@dhis2/d2-i18n`. ⚠️ Holding at `19.8.5` indefinitely is itself risky — i18next 19 is EOL; revisit on next d2-i18n bump.

### Pre-existing (rationale not recovered)

| Pin | Notes |
|---|---|
| `@dhis2/ui-icons: 7.4.1` | Added in commit `f31d19d3` ("Fix yarn start and build"); commit message gives no further detail. Likely held back to match `@dhis2/ui` peer requirements, but this is inference, not confirmed. Leave alone until someone with project history can confirm. |

### Security pins (added 2026-05-06 by `/sca-triage`)

#### `axios: 1.16.0`
- **Why:** Direct dependency. The pin matches the direct `dependencies.axios` and is here defensively to override any transitive request for an older axios.
- **Fixes:** CVE-2025-62718, CVE-2026-42033, CVE-2026-42035, CVE-2026-42038, CVE-2026-42039, CVE-2026-42043, CVE-2026-42044 — and transitively cleared `follow-redirects@1.15.11` (CVE-2026-40895).
- **Drop when:** Both `dependencies.axios` is updated to a still-patched version (any `>= 1.16.0`) AND no transitive consumer requests anything older. In practice: keep this synced with `dependencies.axios` and remove the resolution only if the dep tree clearly has no other consumers of axios below 1.15.0.

#### `flatted: ^3.4.2`
- **Why:** `@vitest/ui`, `flat-cache`, `log4js` all pull `flatted@^3.x` ranges that include the vulnerable `3.3.3`. Forcing `^3.4.2` keeps every parent satisfied.
- **Fixes:** CVE-2026-32141 (high 7.5), GHSA-25h7-pfq9-p65f / CVE-2026-33228 (high 7.5).
- **Drop when:** All three parents publish new versions whose `flatted` range starts at `^3.4.0` or later. Verify with `yarn why flatted` — if every parent line shows `(via npm:^3.4.x)` or higher, the pin is redundant.

#### `handlebars: ^4.7.9`
- **Why:** `@dhis2/d2-i18n-generate@1.2.0` requests `handlebars@^4.0.11`, which resolves to the vulnerable `4.7.8` without this pin.
- **Fixes:** CVE-2026-33937 (critical 9.8), CVE-2026-33938/-33939/-33940/-33941, GHSA-9cx6-37pm-9jff.
- **Drop when:** `@dhis2/d2-i18n-generate` updates to a version that pulls handlebars `>= 4.7.9` natively (check on next bump of that dep).

#### `tar: ^7.5.10`
- **Why:** `node-gyp@12.2.0` requests `tar@^7.5.4`, which resolves to the vulnerable `7.5.9` without this pin.
- **Fixes:** GHSA-qffp-2rhf-9h96 (high 8.0).
- **Drop when:** `node-gyp` updates to a version requesting `tar@^7.5.10` or later.

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
- **Why:** picomatch lives in two major lines in this tree (4.x via the rollup ecosystem, 2.x via the chokidar/micromatch ecosystem). A single global resolution would force one major onto parents that can't take it. Yarn-berry doesn't support range-scoped descriptors (`picomatch@npm:^4` matches literally nothing), so we resolve per-parent-name instead, which is name-stable and version-agnostic. The `vite/picomatch` and `vitest/picomatch` entries were added 2026-05-08 after BOM analysis showed `vite@7.3.2` and `vitest@3.2.4` were pulling `picomatch@4.0.3` directly — neither was covered by the original `@rollup/pluginutils` and `tinyglobby` parent paths.
- **Fixes:** GHSA-c2c7-rcm5-vvqj (CVE-2024-4067, CVE-2024-45296), high 7.5.
- **Drop when:** Each named parent updates to a version that pulls a patched picomatch on its own. Check with `yarn why picomatch`.

#### `brace-expansion` per-exact-parent (4 entries)
```jsonc
"minimatch@npm:10.2.4/brace-expansion": "^5.0.5",
"minimatch@npm:9.0.3/brace-expansion":  "^2.0.3",
"minimatch@npm:7.4.6/brace-expansion":  "^2.0.3",
"minimatch@npm:3.1.2/brace-expansion":  "^1.1.13"
```
- **Why:** brace-expansion has four vulnerable major lines in this tree (1.x, 2.x, 5.x), all parented by different `minimatch` versions sharing the same package name. Yarn-berry only resolves these reliably with the **exact** parent version key.
- **Fixes:** CVE-2026-33750 (high 7.5).
- **⚠️ Decay risk: HIGH.** When any of these `minimatch` versions bumps even by a patch (e.g. `10.2.4` → `10.2.5`), the matching pin **silently stops firing** and yarn does not warn. Re-run `/sca-triage` to re-pin. Consider this entry the most likely to need attention over time.
- **Drop when:** Each `minimatch` major in the tree updates to a version pulling a patched brace-expansion natively, OR all four `minimatch` instances disappear (e.g., grandparents like eslint, depcheck, cacache, @typescript-eslint/typescript-estree get bumped).

#### `vite@npm:^4.0.0/rollup: ^3.30.0`
- **Why:** The application's vite (`devDependencies.vite ^4.0.0` → `vite@4.5.14`) pulls rollup `^3.27.1`, which resolves to the vulnerable `3.29.5`. The vitest tree's vite 7 already gets `rollup@4.60.3` (past the v4 fix line of 4.59.0), so it does not need a pin. The `^4.0.0` parent path scopes this to vite 4.x only — without scoping, a global `rollup` resolution would also downgrade vite 7's rollup 4.
- **Fixes:** GHSA-mw96-cpmx-2vgc (high 8.0).
- **Drop when:** The application is upgraded to vite ≥ 5 (which pulls rollup 4 natively), at which point the pin becomes a no-op and should be removed. Tracked separately as the "vite 4 → 7 migration" PR.

#### `vitest/vite`, `vite-node/vite`, `@vitest/ui/vite: ^7.3.2`
- **Why:** vitest@3.2.4 (and friends) request vite via the range `^5.0.0 || ^6.0.0 || ^7.0.0-0`, which resolves to the vulnerable `vite@7.1.2` without these pins. We do **not** want a global vite resolution because the application's own vite is at v4.
- **Fixes:** CVE-2026-39363, CVE-2026-39364, GHSA-v2wj-q39q-566r — all high 7.5–8.0, dev-server-only.
- **Drop when:** vitest is upgraded past `^3.2.4` to a version whose vite peer range starts at `^7.3.2` or later. (Note: vitest@4 requires vite@6+, which the app does not yet have — see "vite 4 → 7 migration" PR.)

---

## Decay-monitoring checklist

When running `/sca-triage`, treat any of these as a signal that a pin has gone stale:

- A high-severity finding reappears for a package that has an active resolution.
- `yarn why <pkg>` shows the resolved version *not matching* the right-hand side of the resolution.
- A versioned-parent pin (e.g. `minimatch@npm:10.2.4/...`) where `yarn why minimatch` shows no `10.2.4` entry — the pin is now a no-op and should be either re-pinned to the new parent version or removed if no longer needed.

## Future improvements

- Make the existing `dependency-track-yarn4` GitHub workflow **block** on severity ≥ high so a regression doesn't reach `development`.
- Treat `i18next-scanner` and the `d2@31.7.0` chain (via `@dhis2/d2-ui-core`) as **eviction candidates** rather than pin-forever items. Both pull packages with no upstream fix path; replacing or removing them eliminates several findings outright.
- Revisit `lodash` once the team has bandwidth to qualify a `^4.18.0` bump (5+ years since the last lodash minor).
