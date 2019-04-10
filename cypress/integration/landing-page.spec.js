import { dataTest } from "../support/utils";

context("Landing Page", () => {
    before(() => {
        cy.server();
        cy.fixture("app-config.json").then(json => cy.route("GET", "app-config.json", json));
        cy.login("admin");
    });

    beforeEach(() => {
        cy.loadPage();
    });

    it("Has page title", () => {
        cy.title().should("equal", "Metadata Synchronization");
    });

    it("Render table with 7 pages of the application", () => {
        cy.get(dataTest("pages"))
            .should("have.length", 1)
            .should("be.visible");

        cy.contains("Instance Configurator");
        cy.contains("Organisation Units Sync");
        cy.contains("Data Elements Sync");
        cy.contains("Indicators Sync");
        cy.contains("Validation Rules Sync");
        cy.contains("Synchronization Rules");
        cy.contains("Notifications");
    });

    it("Enter Instance Configurator Page", function() {
        cy.get(dataTest("page-instance-configurator")).click();
        cy.get(dataTest("page-header-title")).contains("Instances");
    });

    it("Enter Organisation Units Synchronization Page", function() {
        cy.get(dataTest("page-sync/organisationUnits")).click();
        cy.get(dataTest("page-header-title")).contains("Organisation Units Synchronization");
    });

    it("Enter Data Elements Synchronization Page", function() {
        cy.get(dataTest("page-sync/dataElements")).click();
        cy.get(dataTest("page-header-title")).contains("Data Elements Synchronization");
    });

    it("Enter Indicators Synchronization Page", function() {
        cy.get(dataTest("page-sync/indicators")).click();
        cy.get(dataTest("page-header-title")).contains("Indicators Synchronization");
    });

    it("Enter Validation Rules Synchronization Page", function() {
        cy.get(dataTest("page-sync/validationRules")).click();
        cy.get(dataTest("page-header-title")).contains("Validation Rules Synchronization");
    });
});
