const INPUTS = {
    mode: "mode",
    projectArn: "project-arn",
    artifactTypes: "artifact-types",
    artifactFolder: "artifact-folder",
};

const OUTPUTS = {
    projectArn: "project-arn",
};

const MODE = {
    project: "project",
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
