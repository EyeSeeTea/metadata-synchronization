// <reference types="Cypress" />
/* global Cypress, cy */

import { externalUrl, generateFixtures, stubBackend } from "./network-fixtures";
import _ from "lodash";

const dhis2AuthEnvValue = Cypress.env("DHIS2_AUTH");
if (!dhis2AuthEnvValue) {
    throw new Error("CYPRESS_DHIS2_AUTH=user1:pass1[,user2:pass2,...] not set");
}

export const dhis2Auth = _(dhis2AuthEnvValue)
    .split(",")
    .map(auth => auth.split(":"))
    .fromPairs()
    .value();

Cypress.Commands.add("login", (username, _password = null) => {
    const password = _password || dhis2Auth[username];
    if (stubBackend) {
        cy.log(
            "Stubbing all backend network requests - unmatched requests will automatically fail"
        );
    } else {
        cy.log(`Performing end-to-end test with API server URL '${externalUrl}'`);
        if (generateFixtures) {
            cy.log("Generating fixtures from end-to-end network requests");
        }
    }
    if (!stubBackend) {
        cy.log("Login", { username, password });
        cy.request({
            method: "GET",
            url: `${externalUrl}/api/me`,
            auth: {
                user: username,
                pass: password,
            },
            log: true,
        });
    }
});

Cypress.Commands.overwrite("visit", (originalFn, url, options) => {
    return originalFn(url, {
        onBeforeLoad: win => {
            win.fetch = null;
        },
        ...options,
    });
});

Cypress.Commands.overwrite("get", (originalFn, selector, options) => {
    return originalFn(selector, {
        timeout: 30000,
        ...options,
    });
});

Cypress.on("uncaught:exception", (err, runnable) => {
    // returning false here prevents Cypress from failing the test
    console.log("uncaught:exception", { err, runnable });
    return false;
});
