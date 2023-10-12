const { run } = require("./index.js");
const {
    DeviceFarmClient,
    ListTestGridProjectsCommand,
    CreateTestGridProjectCommand,
    ListTestGridSessionsCommand,
    ListTestGridSessionArtifactsCommand,
} = require("@aws-sdk/client-device-farm");
const axios = require("axios");
const fs = require("fs/promises");
const core = require("@actions/core");
const { MODE, SESSION } = require("./constants");
const { mockClient } = require("aws-sdk-client-mock");
require("aws-sdk-client-mock-jest");

jest.mock("axios");
jest.mock("fs/promises");
jest.mock("@actions/core");

function mockGetInput(requestResponse) {
    const defaults = {
        "artifact-types": "",
        "artifact-folder": "artifacts"
    }
    return function (name, options) { // eslint-disable-line no-unused-vars
        if (!requestResponse[name]) {
            return defaults[name]
        }
        return requestResponse[name]
    }
}

const mockDeviceFarm = mockClient(DeviceFarmClient);

describe("Run", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeviceFarm.reset();
    });

    it("should fail if invalid mode is specified", async () => {
        const INPUTS = {
            "mode": "bad-mode",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));

        await run();

        expect(core.setFailed).toHaveBeenCalledWith(`The mode specified: "${INPUTS.mode}", is invalid, please retry with a valid mode: [${Object.keys(MODE).join()}]`);
    });

    it("should create new project and retrieve no artifacts", async () => {
        const INPUTS = {
            "mode": "project",
            "project-arn": "fake-name",
            "artifact-types": "ALL",
            "artifact-folder": "",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        mockDeviceFarm
            .on(ListTestGridProjectsCommand, {})
            .resolvesOnce({
                testGridProjects: [
                    {
                        arn: "fake-project-arn",
                        name: "no-match-name"
                    }
                ]
            })
            .on(CreateTestGridProjectCommand, {
                name: "fake-name"
            })
            .resolvesOnce({
                testGridProject: {
                    arn: "arn:aws:devicefarm:us-west-2:account-d:testgrid-project:project-id"
                }
            });

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridProjectsCommand, {});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(CreateTestGridProjectCommand, {name: "fake-name"});
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridSessionsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridSessionArtifactsCommand, 0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    it("should lookup project arn and retrieve no artifacts", async () => {
        const INPUTS = {
            "mode": "project",
            "project-arn": "fake-name",
            "artifact-types": "ALL",
            "artifact-folder": "",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        mockDeviceFarm
            .on(ListTestGridProjectsCommand, {})
            .resolvesOnce({
                testGridProjects: [
                    {
                        arn: "fake-project-arn",
                        name: "fake-name"
                    }
                ]
            });

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridProjectsCommand, {});
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridSessionsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridSessionArtifactsCommand, 0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    it("should return supplied project arn and retrieve no artifacts", async () => {
        const INPUTS = {
            "mode": "project",
            "project-arn": "arn:fake-arn",
            "artifact-types": "ALL",
            "artifact-folder": "",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridProjectsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridSessionsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridSessionArtifactsCommand, 0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    it("should retrieve VIDEO artifacts only to default artifacts-folder", async () => {
        const INPUTS = {
            "mode": "artifact",
            "project-arn": "arn:fake-arn",
            "artifact-types": "VIDEO",
            "artifact-folder": "",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        mockDeviceFarm
            .on(ListTestGridSessionsCommand, {
                projectArn: "arn:fake-arn"
            })
            .resolvesOnce({
                testGridSessions: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id",
                        seleniumProperties: "{\"browser\": \"fake-browser\", \"browserVersion\": \"fake-browserVersion\", \"platform\": \"fake-platform\"}"
                    }
                ]
            })
            .on(ListTestGridSessionArtifactsCommand, {
                sessionArn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id",
                type: "VIDEO",
            })
            .resolvesOnce({
                artifacts: [
                    {
                        filename: "fake-filename",
                        type: "VIDEO",
                        url: "fake-url"
                    }
                ]
            });
        fs.mkdir.mockResolvedValue(Promise.resolve());
        axios.get.mockResolvedValue(Promise.resolve({data: ""}));

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridProjectsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridSessionsCommand, {projectArn: "arn:fake-arn"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridSessionArtifactsCommand, {sessionArn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id", type: "VIDEO"});
        expect(fs.mkdir).toBeCalledWith("artifacts/fake-session-id/fake-browser-fake-browserVersion-fake-platform/VIDEO", {"recursive": true});
        expect(axios.get).toHaveBeenCalledWith("fake-url", { "responseType": "arraybuffer" });
        expect(fs.writeFile).toBeCalledWith("artifacts/fake-session-id/fake-browser-fake-browserVersion-fake-platform/VIDEO/fake-filename", Buffer.from(""));
        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    it("should retrieve ALL artifacts", async () => {
        const INPUTS = {
            "mode": "artifact",
            "project-arn": "arn:fake-arn",
            "artifact-types": "ALL",
            "artifact-folder": "fake-folder",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        mockDeviceFarm
            .on(ListTestGridSessionsCommand, {
                projectArn: "arn:fake-arn"
            })
            .resolvesOnce({
                testGridSessions: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id",
                        seleniumProperties: "{\"browser\": \"fake-browser\", \"browserVersion\": \"fake-browserVersion\", \"platform\": \"fake-platform\"}"
                    }
                ]
            });
        SESSION.ARTIFACT_TYPES.forEach(type => {
            mockDeviceFarm
                .on(ListTestGridSessionArtifactsCommand, {
                    sessionArn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id",
                    type: type,
                })
                .resolvesOnce({
                    artifacts: [
                        {
                            filename: `fake-${type}-filename`,
                            type: type,
                            url: `fake-${type}-url`
                        }
                    ]
                });
        });
        fs.mkdir.mockResolvedValue(Promise.resolve());
        axios.get.mockResolvedValue(Promise.resolve({data: ""}));

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridProjectsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridSessionsCommand, {projectArn: "arn:fake-arn"});
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridSessionArtifactsCommand, SESSION.ARTIFACT_TYPES.length);
        SESSION.ARTIFACT_TYPES.forEach(type => {
            expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridSessionArtifactsCommand, {sessionArn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id", type: type});
            expect(fs.mkdir).toBeCalledWith(`fake-folder/fake-session-id/fake-browser-fake-browserVersion-fake-platform/${type}`, {"recursive": true});
            expect(axios.get).toHaveBeenCalledWith(`fake-${type}-url`, { "responseType": "arraybuffer" });
            expect(fs.writeFile).toBeCalledWith(`fake-folder/fake-session-id/fake-browser-fake-browserVersion-fake-platform/${type}/fake-${type}-filename`, Buffer.from(""));
        });
        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    it("should handle invalid project arn", async () => {
        const INPUTS = {
            "mode": "artifact",
            "project-arn": "arn:aws:devicefarm:us-west-2:123456789012:testgrid-project:bad-id",
            "artifact-types": "ALL",
            "artifact-folder": "",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        mockDeviceFarm
            .on(ListTestGridSessionsCommand, {
                projectArn: "arn:aws:devicefarm:us-west-2:123456789012:testgrid-project:bad-id"
            })
            .rejects("The provided resource does not exist: arn:aws:devicefarm:us-west-2:123456789012:testgrid-project:bad-id");

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridProjectsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridSessionsCommand, {projectArn: "arn:aws:devicefarm:us-west-2:123456789012:testgrid-project:bad-id"});
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridSessionArtifactsCommand, 0);
        expect(core.setFailed).toHaveBeenCalledWith("The provided resource does not exist: arn:aws:devicefarm:us-west-2:123456789012:testgrid-project:bad-id");
    });

    it("should handle invalid artifact types", async () => {
        const INPUTS = {
            "mode": "artifact",
            "project-arn": "arn:fake-arn",
            "artifact-types": "fake-type",
            "artifact-folder": "",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        mockDeviceFarm
            .on(ListTestGridSessionsCommand, {
                projectArn: "arn:fake-arn"
            })
            .resolvesOnce({
                testGridSessions: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id",
                        seleniumProperties: "{\"browser\": \"fake-browser\", \"browserVersion\": \"fake-browserVersion\", \"platform\": \"fake-platform\"}"
                    }
                ]
            })
            .on(ListTestGridSessionArtifactsCommand, {
                sessionArn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id",
                type: "fake-type",
            })
            .rejects(`1 validation error detected: Value 'fake-type' at 'type' failed to satisfy constraint: Member must satisfy enum value set: [${SESSION.ARTIFACT_TYPES.join()}]`);

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridProjectsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridSessionsCommand, {projectArn: "arn:fake-arn"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridSessionArtifactsCommand, {sessionArn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id", type: "fake-type"});
        expect(fs.mkdir).toHaveBeenCalledTimes(0);
        expect(axios.get).toHaveBeenCalledTimes(0);
        expect(fs.writeFile).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledWith(`1 validation error detected: Value 'fake-type' at 'type' failed to satisfy constraint: Member must satisfy enum value set: [${SESSION.ARTIFACT_TYPES.join()}]`);
    });

    it("should handle download fail", async () => {
        const INPUTS = {
            "mode": "artifact",
            "project-arn": "arn:fake-arn",
            "artifact-types": "VIDEO",
            "artifact-folder": "",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        mockDeviceFarm
            .on(ListTestGridSessionsCommand, {
                projectArn: "arn:fake-arn"
            })
            .resolvesOnce({
                testGridSessions: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id",
                        seleniumProperties: "{\"browser\": \"fake-browser\", \"browserVersion\": \"fake-browserVersion\", \"platform\": \"fake-platform\"}"
                    }
                ]
            })
            .on(ListTestGridSessionArtifactsCommand, {
                sessionArn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id",
                type: "VIDEO",
            })
            .resolvesOnce({
                artifacts: [
                    {
                        filename: "fake-filename",
                        type: "VIDEO",
                        url: "fake-url"
                    }
                ]
            });
        fs.mkdir.mockResolvedValue(Promise.resolve());
        axios.get.mockResolvedValueOnce(Promise.reject(new Error("fake error")));

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListTestGridProjectsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridSessionsCommand, {projectArn: "arn:fake-arn"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestGridSessionArtifactsCommand, {sessionArn: "arn:aws:devicefarm:us-west-2:account-id:testgrid-session:project-id/fake-session-id", type: "VIDEO"});
        expect(fs.mkdir).toBeCalledWith("artifacts/fake-session-id/fake-browser-fake-browserVersion-fake-platform/VIDEO", {"recursive": true});
        expect(axios.get).toHaveBeenCalledWith("fake-url", { "responseType": "arraybuffer" });
        expect(fs.writeFile).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledWith("fake error");
    });

});
