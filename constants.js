const INPUTS = {
    mode: "mode",
    projectArn: "project-arn",
    urlExpiresSeconds: "url-expires-seconds",
    artifactTypes: "artifact-types",
    artifactFolder: "artifact-folder",
};

const OUTPUTS = {
    projectArn: "project-arn",
    consoleUrl: "console-url",
    gridUrl: "grid-url",
    gridUrlExpires: "grid-url-expires",
};

const MODE = {
    project: "project",
    gridurl: "gridurl",
    artifact: "artifact",
};

const SESSION = {
    ALL_ARTIFACT_TYPES: "ALL",
    ARTIFACT_TYPES: [
        "VIDEO",
        "LOG",
    ]
};

module.exports = {
    INPUTS,
    OUTPUTS,
    MODE,
    SESSION,
};
