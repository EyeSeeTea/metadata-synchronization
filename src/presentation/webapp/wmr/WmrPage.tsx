import { Box } from "@material-ui/core";
import { WmrLogsButton } from "./components/WmrLogsButton";
import { WmrProvider } from "./context/WmrProvider";
import { WmrWizard } from "./WmrWizard";

export type WmrPageProps = {};

export function WmrPage() {
    return (
        <WmrProvider>
            <Box display="flex" justifyContent="flex-end">
                <WmrLogsButton />
            </Box>
            <WmrWizard />
        </WmrProvider>
    );
}
