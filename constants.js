export const INPUTS = {
    mode: "mode",
    projectArn: "project-arn",
    urlExpiresSeconds: "url-expires-seconds",
    artifactTypes: "artifact-types",
    artifactFolder: "artifact-folder",
};

export const OUTPUTS = {
    projectArn: "project-arn",
    consoleUrl: "console-url",
    gridUrl: "grid-url",
    gridUrlExpires: "grid-url-expires",
};

export const MODE = {
    project: "project",
    gridurl: "gridurl",
    artifact: "artifact",
};

export const SESSION = {
    ALL_ARTIFACT_TYPES: "ALL",
    ARTIFACT_TYPES: [
        "VIDEO",
        "LOG",
    ]
};
