type AggregatedDataExchangeRequest = {
    name: string;
    dx: string[];
    pe: string[];
    ou: string[];
    inputIdScheme: Scheme;
    outputIdScheme: Scheme;
};

type AggregatedDataExchangeSource = {
    params: {
        periodTypes: string[];
    };
    requests: AggregatedDataExchangeRequest[];
};

type AggregatedDataExchangeApiConfig = {
    url: string;
    username?: string;
    password?: string;
    token?: string;
};

type AggregatedDataExchangeTarget = {
    type: "EXTERNAL" | "INTERNAL";
    api: AggregatedDataExchangeApiConfig;
    request: {
        idScheme: Scheme;
    };
};

type Scheme = "UID" | "CODE";

export type AggregatedDataExchange = {
    id: string;
    name: string;
    source: AggregatedDataExchangeSource;
    target: AggregatedDataExchangeTarget;
};
