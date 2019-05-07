import { dataTest } from "../support/utils";

context("Instance Configurator", function() {
    before(() => {
        cy.server();
        cy.fixture("app-config.json").then(json => cy.route("GET", "app-config.json", json));
        cy.login("admin");
        cy.visit("/#/instance-configurator");
    });

    beforeEach(() => {});

    it("Page title is correct", function() {
        cy.get(dataTest("page-header-title")).contains("Instances");
    });

    it("Open new instance page", function() {
        cy.get(dataTest("list-action-bar")).click();
        cy.get(dataTest("page-header-title")).contains("New Instance");
    });
});
