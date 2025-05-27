import { Button, Grid, Typography } from "@material-ui/core";
import { CloudDownload, HelpSharp } from "@material-ui/icons";
import i18n from "../../../utils/i18n";

export function InstallMetadataPackage() {
    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Typography variant="body1">
                    {i18n.t("Have you installed the metadata package that creates the test data set?")}
                </Typography>
            </Grid>
            <Grid item xs={12}>
                <Button
                    download="metadata.json"
                    href="wmr/metadata.json"
                    variant="contained"
                    color="primary"
                    endIcon={<CloudDownload />}
                >
                    {i18n.t("Download metadata package")}
                </Button>
            </Grid>
            <Grid item xs={12}>
                <Button
                    download="datastore_config.json"
                    href="wmr/dataStore.json"
                    variant="contained"
                    color="primary"
                    endIcon={<CloudDownload />}
                >
                    {i18n.t("Autogenform configuration")}
                </Button>
            </Grid>
            <Grid item xs={12}>
                <Button variant="contained" color="primary" endIcon={<HelpSharp />}>
                    {i18n.t("Tutorial: How to install metadata package", { nsSeparator: false })}
                </Button>
            </Grid>
        </Grid>
    );
}
