import { Request, Server } from "miragejs";
import { AnyRegistry } from "miragejs/-types";
import Schema from "miragejs/orm/schema";
import { startDhis } from "../../../../utils/dhisServer";
import { RepositoryFactory } from "../../../../domain/common/factories/RepositoryFactory";
import { EventsSyncUseCase } from "../../../../domain/events/usecases/EventsSyncUseCase";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { Repositories } from "../../../../domain/Repositories";
import { SynchronizationBuilder } from "../../../../types/synchronization";
import { AggregatedD2ApiRepository } from "../../../aggregated/AggregatedD2ApiRepository";
import { EventsD2ApiRepository } from "../../../events/EventsD2ApiRepository";
import { InstanceD2ApiRepository } from "../../../instance/InstanceD2ApiRepository";
import { StorageDataStoreRepository } from "../../../storage/StorageDataStoreRepository";
import { TransformationD2ApiRepository } from "../../../transformations/TransformationD2ApiRepository";
import { MetadataD2ApiRepository } from "../../MetadataD2ApiRepository";

const repositoryFactory = buildRepositoryFactory();

describe("Sync metadata", () => {
    let local: Server;
    let remote: Server;

    beforeAll(() => {
        jest.setTimeout(30000);
    });

    beforeEach(() => {
        local = startDhis({ urlPrefix: "http://origin.test" });
        remote = startDhis({
            urlPrefix: "http://destination.test",
            pretender: local.pretender,
        });

        local.get("/categoryOptionCombos", async () => ({
            categoryOptionCombos: [
                {
                    name: "default",
                    id: "default8",
                    categoryCombo: { id: "default7" },
                    categoryOptions: [{ id: "default5" }],
                },
            ],
        }));

        remote.get("/categoryOptionCombos", async () => ({
            categoryOptionCombos: [
                {
                    name: "default",
                    id: "default4",
                    categoryCombo: { id: "default3" },
                    categoryOptions: [{ id: "default1" }],
                },
            ],
        }));

        local.get("/metadata", async (_schema, request) => {
            if (request.queryParams.filter === "id:in:[program1]")
                return {
                    programs: [
                        {
                            name: "Test program",
                            id: "program1",
                            programStages: [
                                {
                                    programStageDataElements: [
                                        {
                                            dataElement: {
                                                name: "Test data element",
                                                id: "id1",
                                                displayFormName: "Test data element",
                                            },
                                        },
                                    ],
                                },
                            ],
                            programIndicators: [],
                        },
                    ],
                };

            if (request.queryParams.filter === "code:eq:default")
                return {
                    categoryOptions: [{ id: "default1" }],
                    categories: [{ id: "default2" }],
                    categoryCombos: [{ id: "default3" }],
                    categoryOptionCombos: [{ id: "default4" }],
                };

            console.log("Unknown metadata request", request.queryParams);
        });

        local.get("/dataValueSets", async () => ({ dataValues: [] }));
        remote.get("/dataValueSets", async () => ({ dataValues: [] }));

        local.get("/events", async () => ({
            events: [
                {
                    storedBy: "widp.admin",
                    dueDate: "2020-04-11T00:00:02.846",
                    program: "program1",
                    event: "test-event-1",
                    programStage: "EGA9fqLFtxM",
                    orgUnit: "Global",
                    status: "ACTIVE",
                    orgUnitName: "Global",
                    eventDate: "2020-04-11T00:00:00.000",
                    attributeCategoryOptions: "Y7fcspgsU43",
                    lastUpdated: "2020-06-09T07:06:35.514",
                    created: "2020-06-09T07:06:35.513",
                    deleted: false,
                    attributeOptionCombo: "Xr12mI7VPn3",
                    dataValues: [
                        {
                            lastUpdated: "2020-06-09T07:06:35.515",
                            storedBy: "widp.admin",
                            created: "2020-06-09T07:06:35.515",
                            dataElement: "id1",
                            value: "true",
                            providedElsewhere: false,
                        },
                    ],
                    notes: [],
                },
            ],
        }));

        remote.get("/events", async () => ({
            events: [
                {
                    storedBy: "widp.admin",
                    dueDate: "2020-04-11T00:00:02.846",
                    program: "program1",
                    event: "test-event-2",
                    programStage: "EGA9fqLFtxM",
                    orgUnit: "Global",
                    status: "ACTIVE",
                    orgUnitName: "Global",
                    eventDate: "2020-04-11T00:00:00.000",
                    attributeCategoryOptions: "Y7fcspgsU43",
                    lastUpdated: "2020-06-09T07:06:35.514",
                    created: "2020-06-09T07:06:35.513",
                    deleted: false,
                    attributeOptionCombo: "Xr12mI7VPn3",
                    dataValues: [
                        {
                            lastUpdated: "2020-06-09T07:06:35.515",
                            storedBy: "widp.admin",
                            created: "2020-06-09T07:06:35.515",
                            dataElement: "id1",
                            value: "true",
                            providedElsewhere: false,
                        },
                    ],
                    notes: [],
                },
            ],
        }));

        remote.get("/metadata", async () => ({
            categoryOptions: [{ id: "default5" }],
            categories: [{ id: "default6" }],
            categoryCombos: [{ id: "default7" }],
            categoryOptionCombos: [{ id: "default8" }],
            dataElements: [{ id: "id2", name: "Test data element 2" }],
        }));

        local.get("/dataStore/metadata-synchronization/instances", async () => [
            {
                id: "DESTINATION",
                name: "Destination test",
                url: "http://destination.test",
                username: "test",
                password: "",
                description: "",
            },
        ]);

        const addEventsToDb = async (schema: Schema<AnyRegistry>, request: Request) => {
            schema.db.events.insert(JSON.parse(request.requestBody));

            return {
                responseType: "ImportSummary",
                status: "WARNING",
                description: "Import process completed successfully",
                importCount: { imported: 0, updated: 0, ignored: 477, deleted: 0 },
                conflicts: [
                    {
                        object: "id1",
                        value: "Data element not found or not accessible",
                    },
                ],
                dataSetComplete: "false",
            };
        };

        local.db.createCollection("events", []);
        local.post("/events", addEventsToDb);

        remote.db.createCollection("events", []);
        remote.post("/events", addEventsToDb);
    });

    afterEach(() => {
        local.shutdown();
        remote.shutdown();
    });

    it("Local server to remote - same version", async () => {
        const localInstance = Instance.build({
            url: "http://origin.test",
            name: "Testing",
            version: "2.30",
        });

        const builder: SynchronizationBuilder = {
            originInstance: "LOCAL",
            targetInstances: ["DESTINATION"],
            metadataIds: ["program1"],
            excludedIds: [],
            dataParams: {
                allEvents: true,
                orgUnitPaths: ["/Global"],
            },
        };

        const sync = new EventsSyncUseCase(builder, repositoryFactory, localInstance, "");

        const payload = await sync.buildPayload();
        expect(payload.events?.find(({ id }) => id === "test-event-1")).toBeDefined();

        for await (const { done } of sync.execute()) {
            if (done) console.log("Done");
        }

        const response = remote.db.events.find(1);
        expect(response.events[0].id).toEqual("test-event-1");
        expect(local.db.events.find(1)).toBeNull();
    });

    it("Remote server to local - same version", async () => {
        const localInstance = Instance.build({
            url: "http://origin.test",
            name: "Testing",
            version: "2.30",
        });

        const builder: SynchronizationBuilder = {
            originInstance: "DESTINATION",
            targetInstances: ["LOCAL"],
            metadataIds: ["program1"],
            excludedIds: [],
            dataParams: {
                allEvents: true,
                orgUnitPaths: ["/Global"],
            },
        };

        const sync = new EventsSyncUseCase(builder, repositoryFactory, localInstance, "");

        const payload = await sync.buildPayload();
        expect(payload.events?.find(({ id }) => id === "test-event-2")).toBeDefined();

        for await (const { done } of sync.execute()) {
            if (done) console.log("Done");
        }

        const response = local.db.events.find(1);
        expect(response.events[0].id).toEqual("test-event-2");
        expect(remote.db.events.find(1)).toBeNull();
    });
});

function buildRepositoryFactory() {
    const repositoryFactory: RepositoryFactory = new RepositoryFactory();
    repositoryFactory.bind(Repositories.InstanceRepository, InstanceD2ApiRepository);
    repositoryFactory.bind(Repositories.StorageRepository, StorageDataStoreRepository);
    repositoryFactory.bind(Repositories.MetadataRepository, MetadataD2ApiRepository);
    repositoryFactory.bind(Repositories.AggregatedRepository, AggregatedD2ApiRepository);
    repositoryFactory.bind(Repositories.EventsRepository, EventsD2ApiRepository);
    repositoryFactory.bind(Repositories.TransformationRepository, TransformationD2ApiRepository);
    return repositoryFactory;
}

export {};
