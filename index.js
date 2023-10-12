const {
    DeviceFarmClient,
    paginateListTestGridProjects,
    CreateTestGridProjectCommand,
    paginateListTestGridSessions,
    paginateListTestGridSessionArtifacts,
} = require("@aws-sdk/client-device-farm");
const fs = require("fs/promises");
const core = require("@actions/core");
const axios = require("axios");
const { INPUTS, OUTPUTS, MODE, SESSION } = require("./constants.js");

const deviceFarm = new DeviceFarmClient();

async function getProjectArn(projectArn) {
    // ARN Already supplied no action required, just return the value provided.
    if (projectArn.startsWith("arn:")) return projectArn;
    // Loop through existing projects to find the first project with the name matching the one supplied in the projectArn field.
    const listProjects = paginateListTestGridProjects({
        client: deviceFarm
    }, {});
    for await (const page of listProjects) {
        const project = page.testGridProjects.find(p => p.name === projectArn);
        if (project) {
            core.info(`Existing project with name ${projectArn} found.`);
            return project.arn;
        }
    }
    // No Project with supplied name found so creating new project with this name.
    const createProjectCommand = new CreateTestGridProjectCommand({
        name: projectArn
    });
    core.info(`Existing project with name ${projectArn} not found, so creating a new project...`);
    const createProjectRes = await deviceFarm.send(createProjectCommand);
    return createProjectRes.testGridProject.arn;
}

async function loopSessions(projectArn, desiredTypes, artifactFolder) {
    // Update the desiredTypes array to be all possible values if the supplied value is 'ALL'
    if (desiredTypes.length === 1 &&  desiredTypes[0] === SESSION.ALL_ARTIFACT_TYPES) desiredTypes = SESSION.ARTIFACT_TYPES;
    // Loop sessions and desired types and get artifacts for each
    const listSessions = paginateListTestGridSessions({
        client: deviceFarm
    }, {
        projectArn: projectArn
    });
    const artifactProms = [];
    for await (const page of listSessions) {
        page.testGridSessions.map(session => {
            desiredTypes.map(type => {
                artifactProms.push(loopArtifacts({ session, type, artifactFolder }));
            });
        });
    }
    return await Promise.all(artifactProms);
}


async function loopArtifacts({ session, type, artifactFolder }) {
    const sessionId = session.arn.split(":")[6].split("/")[1];
    // Loop all artifacts of each type for the specified session and download them.
    core.info(`Listing artifacts of type ${type} for session id ${sessionId}...`);
    const listArtifacts = paginateListTestGridSessionArtifacts({
        client: deviceFarm
    }, {
        sessionArn: session.arn,
        type: type,
    });
    const downloadProms = []
    for await (const page of listArtifacts) {
        page.artifacts.map(artifact => {
            downloadProms.push(downloadArtifact({ artifact, session, artifactFolder }));
        });
    }
    // Await all promises to complete before returning.
    return await Promise.all(downloadProms);
}

async function downloadArtifact({ artifact, session, artifactFolder }) {
    // Grab session id from ARN to use in folder name.
    const sessionId = session.arn.split(":")[6].split("/")[1];
    // Read the seleniumProperties from the session this provides the browser, browser version and platform information, again to use as folder name.
    const seleniumProperties = JSON.parse(session.seleniumProperties);
    const basePath = `${artifactFolder}/${sessionId}/${seleniumProperties.browser}-${seleniumProperties.browserVersion}-${seleniumProperties.platform}/${artifact.type}`;
    const downloadPath = `${basePath}/${artifact.filename}`;
    // Create the download folder.
    await fs.mkdir(basePath, { recursive: true });
    const response = await axios.get(artifact.url, { responseType: "arraybuffer" });
    const fileData = Buffer.from(response.data, "binary");
    core.info(`Downloading ${downloadPath}...`);
    // Return a promise for writing the downloaded file.
    return fs.writeFile(downloadPath, fileData);
}

async function run() {
    // Read the GH Action inputs
    const mode = core.getInput(INPUTS.mode, { required: true }).toLowerCase();
    if (mode in MODE) {
        let projectArn = core.getInput(INPUTS.projectArn, { required: true });
        const artifactTypes = core.getInput(INPUTS.artifactTypes, { required: false }).split(",").map(v => v.trim()).filter(v => v !== "");
        const artifactFolder = core.getInput(INPUTS.artifactFolder, { required: false });
        try {
            // Set the projectArn to the actual Arn (in case a name is provided and project needs creating)
            projectArn = await getProjectArn(projectArn);
            // Parse the project id
            const projectId = projectArn.split(":")[6];
            core.info(`Project Id: ${projectId}.`);
            // Set the output so this Arn can be used elsewhere in the GH workflow
            core.setOutput(OUTPUTS.projectArn, projectArn);
            if (mode == MODE.artifact && artifactTypes.length > 0) {
                core.startGroup("Download artifacts");
                await loopSessions(projectArn, artifactTypes, artifactFolder);
                core.endGroup();
            }
        } catch (error) {
            core.setFailed(error.message);
        }
    } else {
        core.setFailed(`The mode specified: "${mode}", is invalid, please retry with a valid mode: [${Object.keys(MODE).join()}]`);
    }
}

module.exports = {
    run,
};

/* istanbul ignore next */
if (require.main === module) {
    run();
}
