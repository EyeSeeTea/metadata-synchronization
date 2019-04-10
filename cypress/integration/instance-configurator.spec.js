import { dataTest, dataField } from "../support/utils";
import { dhis2Auth } from "../support/commands";
import { externalUrl } from "../support/network-fixtures";

context("Instance Configurator", function() {
    before(() => {
        cy.server();
        cy.fixture("app-config.json").then(json => cy.route("GET", "app-config.json", json));
        cy.login("admin");
    });

    beforeEach(() => {
        cy.route("/#/instance-configurator").as("instanceConfigurator");

        cy.loadPage("/#/instance-configurator");
        cy.get(dataTest("page-header-title")).contains("Instances");

        /** TODO: Waiting to add more data selectors to dialog in d2-ui-components
         cy.get(".data-table__rows__row").each((element, index) => {
             cy.wrap(element).trigger("contextmenu");
             cy.get(".data-table__context-menu").within(() => {
                 cy.contains("Delete").click();
             });
         });
         */

        /** TODO: Waiting to remove all existing instances before setting the new ones
         cy.get(dataTest("list-action-bar")).click();
         cy.get(dataTest("page-header-title")).contains("New Instance");

         cy.get(dataField("name")).type("Cypress Instance");
         cy.get(dataField("username")).type("admin");
         cy.get(dataField("password")).type(dhis2Auth["admin"]);
         cy.get(dataField("url")).type(externalUrl);

         cy.get(dataTest("save-button")).click();

         cy.wait("@instanceConfigurator");
         */
    });

    it("Open new instance page", function() {
        cy.get(dataTest("list-action-bar")).click();
        cy.get(dataTest("page-header-title")).contains("New Instance");
    });
});
