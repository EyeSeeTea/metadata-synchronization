import {
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    createStyles,
    makeStyles,
    TextField,
    Theme,
} from "@material-ui/core";
import React, { useState } from "react";
import i18n from "../../locales";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        container: {
            display: "flex",
            flexWrap: "wrap",
            width: 400,
            margin: `${theme.spacing(0)} auto`,
        },
        card: {
            marginTop: theme.spacing(10),
        },
        header: {
            textAlign: "center",
            background: "#212121",
            color: "#fff",
        },
        button: {
            marginTop: theme.spacing(2),
            flexGrow: 1,
        },
    })
);

export interface LoginConfig {
    server: string;
    username?: string;
    password?: string;
}

export interface LoginPageProps {
    title?: string;
    loginAction: (config: LoginConfig) => void;
    loading?: boolean;
    error?: boolean;
    server?: string;
}

const isValid = (val: string) => val && val.length >= 2;

const LoginPage: React.FC<LoginPageProps> = ({
    title = i18n.t("Welcome"),
    loginAction,
    loading = false,
    error = false,
    server: defaultServer = "",
}) => {
    const classes = useStyles();
    const [server, setServer] = useState(defaultServer);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = () => {
        if (isValid(server) && isValid(username) && isValid(password)) {
            loginAction({ server, username, password });
        }
    };

    return (
        <React.Fragment>
            <form className={classes.container} autoComplete="off" onSubmit={handleLogin}>
                <Card className={classes.card}>
                    <CardHeader className={classes.header} title={title} />
                    <CardContent>
                        <div>
                            <TextField
                                fullWidth
                                id={"server"}
                                type={"url"}
                                label={i18n.t("Server")}
                                value={server}
                                margin={"normal"}
                                autoComplete={"server"}
                                onChange={e => setServer(e.target.value)}
                            />
                            <TextField
                                fullWidth
                                id={"username"}
                                type={"text"}
                                label={i18n.t("Username")}
                                error={error}
                                margin={"normal"}
                                autoComplete={"username"}
                                onChange={e => setUsername(e.target.value)}
                            />
                            <TextField
                                fullWidth
                                id={"password"}
                                type={"password"}
                                label={i18n.t("Password")}
                                error={error}
                                margin={"normal"}
                                autoComplete={"password"}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardActions>
                        <Button
                            variant={"contained"}
                            color={"primary"}
                            className={classes.button}
                            onClick={() => handleLogin()}
                            disabled={loading}
                        >
                            {i18n.t("Login")}
                        </Button>
                    </CardActions>
                </Card>
            </form>
        </React.Fragment>
    );
};

export default LoginPage;
