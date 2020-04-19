import React, { Component, ErrorInfo } from "react";
import ErrorPage from "./ErrorPage";

export class ErrorBoundary extends Component {
    state = {
        error: null,
        errorInfo: null,
    };

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (process.env.NODE_ENV !== "development") {
            this.setState({
                error,
                errorInfo,
            });
        }
    }

    render() {
        const { children } = this.props;
        const { error, errorInfo } = this.state;

        return error ? <ErrorPage error={error} errorInfo={errorInfo} /> : children;
    }
}
