import { ButtonProps, Icon, IconButton, Tooltip } from "@material-ui/core";
import { Variant } from "@material-ui/core/styles/createTypography";
import Typography from "@material-ui/core/Typography";
import { DialogButton } from "d2-ui-components";
import React, { ReactNode } from "react";
import i18n from "../../../../locales";

const PageHeader: React.FC<PageHeaderProps> = ({
    variant = "h5",
    title,
    onBackClick,
    help,
    children,
}) => {
    return (
        <div>
            {!!onBackClick && (
                <IconButton
                    onClick={onBackClick}
                    color="secondary"
                    aria-label={i18n.t("Back")}
                    style={styles.backArrow}
                    data-test={"page-header-back"}
                >
                    <Icon color="primary">arrow_back</Icon>
                </IconButton>
            )}

            <Typography
                variant={variant}
                gutterBottom
                style={styles.text}
                data-test={"page-header-title"}
            >
                {title}
            </Typography>
            {help && renderHelpButton(help)}
            {children}
        </div>
    );
};

export interface PageHeaderProps {
    variant?: Variant;
    title: string;
    onBackClick?: () => void;
    help?: ReactNode;
}

const styles = {
    backArrow: { paddingTop: 10, marginBottom: 5 },
    help: { marginBottom: 8 },
    text: { display: "inline-block", fontWeight: 300 },
};

const Button = ({ onClick }: ButtonProps) => (
    <Tooltip title={i18n.t("Help")}>
        <IconButton onClick={onClick} style={styles.help}>
            <Icon color="primary">help</Icon>
        </IconButton>
    </Tooltip>
);

const renderHelpButton = (help: ReactNode) => (
    <DialogButton
        buttonComponent={Button}
        title={i18n.t("Help")}
        maxWidth={"sm"}
        fullWidth={true}
        contents={help}
    />
);

export default PageHeader;
