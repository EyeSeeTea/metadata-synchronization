## Setup

## Setup

```
$ nvm use  # uses node version in .nvmrc if present
$ yarn install
```

This project uses **Yarn 4** managed by **Corepack** and declares:

```json
"packageManager": "yarn@4.12.0"
```

### Recommended: disable Corepack auto-pin globally (macOS, zsh)

To avoid Corepack modifying the `package.json` of **other** projects when you run `corepack enable` or `yarn` in repositories that do **not** define `packageManager`, it is recommended to disable the global auto‑pin:

1. Open your shell configuration (`zsh`):

```bash
nano ~/.zshrc   # or use code/vim, etc.
```

2. Add this line at the end of the file:

```bash
export COREPACK_ENABLE_AUTO_PIN=0
```

3. Reload the configuration in the current session:

```bash
source ~/.zshrc
```

4. Verify that it is active:

```bash
echo $COREPACK_ENABLE_AUTO_PIN
# should print: 0
```

From that point on, with `corepack enable` active, when you run `yarn` in projects **without** `packageManager`, Corepack will no longer add the `packageManager` field automatically to their `package.json`.

### If you have Yarn 1 globally and see a packageManager error

If running `yarn` shows an error like:

> This project's package.json defines "packageManager": "yarn@4.12.0". However the current global version of Yarn is 1.22.x.

do the following once on your machine:

```bash
# 1) Remove global Yarn (optional but recommended)
npm uninstall -g yarn

# 2) Enable Corepack (shipped with Node 16.9+ / 14.19+)
corepack enable

# 3) Set Yarn 1.x as the default for projects WITHOUT packageManager
corepack prepare yarn@1.22.22 --activate
```

Then, in this project (normal case, once Corepack is enabled):

```bash
nvm use   # use the version from .nvmrc
yarn install
```

If for some reason `yarn --version` still shows `1.x` inside this repo (for example due to old Corepack state), prepare the Yarn 4 binary without changing the global default or `package.json`:

```bash
COREPACK_ENABLE_AUTO_PIN=0 corepack prepare yarn@4.12.0
yarn --version   # should now print 4.12.0
yarn install
```

After this:

-   This repo will use **Yarn 4.12.0**.
-   Other repos without `packageManager` will keep using **Yarn 1.22.22** (or whatever you activated with `corepack prepare`).

## App configuration (`app-config.json`)

The app reads `app-config.json` when it starts. Its source is `public/app-config.template.json`, which is tracked in git and holds no secrets.

-   **Release builds:** `yarn build` writes `build/app-config.json` from the template for every variant, so each ZIP contains it. It never copies a local `public/app-config.json`. The ZIP only carries what the app reads: `appKey`, `appearance` and `feedback`. The build fails if the template is invalid or contains `encryptionKey`.
-   **Local development:** `yarn start` serves `public/`. Create `public/app-config.json` by copying the template. That file is git-ignored.

### Upgrading from versions before 2.25.0

An `encryptionKey` field is only needed for one upgrade case: an installation older than 2.25.0 that has remote instances saved with a password. Migration 16 moves those instances to DHIS2 routes and needs the key to decrypt their passwords. A fresh installation never runs this migration, and an upgrade without saved passwords does not need the key either.

DHIS2 deletes the files of the previous version when it installs a new one, so the old `app-config.json` is gone after the upgrade. Before installing, add an `encryptionKey` field with the encryption key of the previous installation to `app-config.json` inside the release ZIP. If you run the scheduler, it is the `encryptionKey` in its configuration file.

```bash
unzip metadata-synchronization.zip app-config.json
# edit app-config.json and add "encryptionKey": "<the previous installation's key>"
zip metadata-synchronization.zip app-config.json
```

Install that ZIP, let the migration run, and then install the unmodified ZIP again so the key is no longer served. Do not share the modified ZIP.

## Migrations

The app uses the DHIS2 data store to persist custom data. Whenever the schema of the data store changes, we'll create a [migration task](src/data/migrations/tasks) with an incremental version. \*.ts files in this folder are automatically loaded.

When writing a migration, we must define the old/new types of data structures used in that migration task. Note that we cannot rely on types on the app, as they may have diverged. For fields/objects we must reference but don't care the type, we will use `unknown` (not `any`).

When the app starts, it will check the data store version and open a dialog if a migration is required. You can also run the migrations on the CLI:

```
$ yarn migrate 'http://admin:PASSWORD@localhost:8080'
```

The CLI cannot read `app-config.json`, so it cannot run migration 16 when remote instances have saved passwords. Run that upgrade from the app, as explained in [Upgrading from versions before 2.25.0](#upgrading-from-versions-before-2250).

## Scheduler

The app provides a server-side scheduler script that runs synchronization rules in the background. The script requires Node v10+.

-   Unzip metadata-synchronization-server.zip and can be executed like this:

```
$ cd metadata-synchronization-server
$ node index.js -c app-config.json
```

The `-c` option is required. The configuration file tells the script how to connect to the DHIS2 instance:

```json
{
    "baseUrl": "https://play.dhis2.org/2.30",
    "username": "admin",
    "password": "district"
}
```

The file holds credentials, so keep it out of git. Older configuration files may still have an `encryptionKey` field. It is ignored.

## Development

### Start the development server of the main application:

```
$ yarn start
```

Now in your browser, go to `http://localhost:8081`.

Notes:

-   Requests to DHIS2 will be transparently proxied (see `src/setupProxy.js`) from `http://localhost:8081/dhis2/path` to `http://localhost:8080/path` to avoid CORS and cross-domain problems.

-   The optional environment variable `VITE_DHIS2_AUTH=USERNAME:PASSWORD` forces some credentials to be used by the proxy. This variable is usually not set, so the app has the same user logged in at `VITE_DHIS2_BASE_URL`.

-   Create a file `.env.local` (copy it from `.env`) to customize environment variables so you can simply run `yarn start`.

-   [why-did-you-render](https://github.com/welldone-software/why-did-you-render) is installed and runs in development mode by default. Edit `src/presentation/utils/wdyr.ts` to customize or disable it.

### Customization of the development server:

```
$ yarn start -p 8082 core-app|data-metadata-app|module-package-app|modules-list|package-exporter|msf-aggregate-data-app
```

This will open the development server for the given front-end at port 8082 and will connect to DHIS 2 instance http://localhost:8080.

### Customize DHIS2 instance url

```
VITE_DHIS2_BASE_URL=http://localhost:8080
```

To use a different DHIS2 instance url set this environment variable before running a `start` command.

## Tests

Run unit tests:

```
$ yarn test
```

## Build

To build all the front-ends:

```
$ yarn build
```

To build a given front-end:

```
$ yarn build [all|core-app|data-metadata-app|module-package-app|modules-list|package-exporter|msf-aggregate-data-app|sp-emergency-responses|wmr]
```

`yarn build` already builds the scheduler and emits the `metadata-synchronization-server.zip` file
alongside the front-end zips, so it is always included in releases.

To build the scheduler on its own:

```
$ yarn build-scheduler
```

This script generate a metadata-synchronization-server.zip file.

## i18n

### Update an existing language

```
$ yarn update-po
# ... add/edit translations in po files ...
$ yarn localize
```

These commands use `@dhis2/cli-app-scripts` through `d2-app-scripts i18n extract` and `d2-app-scripts i18n generate`.

## depcheck

Check for unused or missing dependencies:

```
$ yarn run depcheck
```
