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

File `public/app-config.json` must be created by duplicating `public/app-config.template.json` and filling in the encryptionKey.

## Migrations

The app uses the DHIS2 data store to persist custom data. Whenever the schema of the data store changes, we'll create a [migration task](src/migrations/tasks) with an incremental version. \*.ts files in this folder are automatically loaded.

When writing a migration, we must define the old/new types of data structures used in that migration task. Note that we cannot rely on types on the app, as they may have diverged. For fields/objects we must reference but don't care the type, we will use `unknown` (not `any`).

When the app starts, it will check the data store version and open a dialog if a migration is required. You can also run the migrations on the CLI:

```
$ yarn migrate 'http://admin:PASSWORD@localhost:8080'
```

## Scheduler

The app provides a server-side scheduler script that runs synchronization rules in the background. The script requires Node v10+.

-   Unzip metadata-synchronization-server.zip and can be executed like this:

```
$ cd metadata-synchronization-server
$ node index.js -c app-config.json
```

To connect to the destination instance, it requires a configuration file. If no configuration file is supplied the following is used as a placeholder:

```json
{
    "encryptionKey": "encryptionKey",
    "baseUrl": "https://play.dhis2.org/2.30",
    "username": "admin",
    "password": "district"
}
```

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
