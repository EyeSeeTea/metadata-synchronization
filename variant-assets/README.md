# Variant-Specific Assets

This directory contains assets that should only be included in specific app variants.

Each variant can have its own subdirectory containing assets that will be copied to the `public/` folder during build or development.

## How It Works

The `scripts/helpers/variant-assets.ts` module manages the copying and cleanup of variant-specific assets:

1. **During build**: Assets are copied to `public/` before the build runs and cleaned up after
2. **During development**: Assets are copied to `public/` when the dev server starts and cleaned up on exit

The configuration is defined in `variantAssetsConfig` in `scripts/helpers/variant-assets.ts`.

## Adding New Variant Assets

1. Create a subdirectory in `variant-assets/` with the name of your assets (e.g., `my-variant-files/`)
2. Add the mapping in `scripts/helpers/variant-assets.ts`:
    ```typescript
    const variantAssetsConfig: Record<string, string[]> = {
        wmr: ["wmr"],
        "my-variant": ["my-variant-files"],
    };
    ```
3. Add the public variant-specific path to `.gitignore` to prevent it from being committed:
    ```
    /public/my-variant-files
    ```

## WMR document assets

The WMR package keeps document metadata in `wmr/metadata.json`, with the
binary files under `wmr/documents/`. The `wmr/documentFiles.json` manifest
maps each DHIS2 document UID to its bundled file, filename, content type, and
integrity information. The WMR prerequisite installer uploads these files as
DHIS2 file resources before importing the metadata so constant descriptions
and their translated document links continue to work on the target instance.

The metadata export is intentionally scoped to the WMR dataset. It excludes
the unrelated MAL_EPI/SNT data-element groups and their reverse links because
those groups reference data elements outside this package and would make the
DHIS2 metadata import fail with invalid references.

The WMR form is driven by the current rich `0MAL_5` d2-autogen-forms
configuration, mapped to the packaged dataset code
`MAL_WMR_COUNTRY_SYNC`. Only its 75 data-element settings and the 61 section
settings represented in this metadata export are bundled. This keeps a fresh
installation self-contained; the live `/MAL-WMR` key currently contains an
unrelated policy configuration and is not copied into the WMR package.

The JSON file is not a standalone binary backup: its internal document `url`
values are file-resource references and the file resources are uploaded from
`wmr/documents/` by the WMR installer. A manual import must upload those files
to `/api/fileResources` first and replace each document URL with the returned
file-resource ID; importing `metadata.json` alone will produce missing-URL
errors.
