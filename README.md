# AWS Device Farm Browser Testing for GitHub Actions

Automates Browser Testing on AWS Device Farm.

This GitHub Action allows you to interact with [desktop browser testing](https://docs.aws.amazon.com/devicefarm/latest/testgrid/what-is-testgrid.html) on [AWS Device Farm](https://aws.amazon.com/device-farm/).
For example, testing new versions of code being committed to a branch to ensure the App works as desired before proceeding with the next step in the release cycle.

## Table of Contents

<!-- toc -->

- [AWS Device Farm Browser Testing for GitHub Actions](#aws-device-farm-browser-testing-for-github-actions)
  - [Table of Contents](#table-of-contents)
  - [Input options](#input-options)
  - [Output options](#output-options)
  - [Examples of Usage](#examples-of-usage)
    - [Before each of the following examples, make sure to include the following](#before-each-of-the-following-examples-make-sure-to-include-the-following)
    - [Creating a new AWS Device Farm Project](#creating-a-new-aws-device-farm-project)
    - [Lookup an existing AWS Device Farm Project](#lookup-an-existing-aws-device-farm-project)
    - [Generate a Test Grid URL for an existing AWS Device Farm Project](#generate-a-test-grid-url-for-an-existing-aws-device-farm-project)
    - [Retrieve All artifacts](#retrieve-all-artifacts)
    - [Retrieve VIDEO and LOG artifacts](#retrieve-video-and-log-artifacts)
    - [Putting it all together with webdriver.io to execute the tests](#putting-it-all-together-with-webdriverio-to-execute-the-tests)
    - [Putting it all together more generically using the Test Grid Url mode](#putting-it-all-together-more-generically-using-the-test-grid-url-mode)
  - [Credentials](#credentials)
    - [AWS Credentials](#aws-credentials)
  - [Permissions](#permissions)
    - [Running the action in `project` mode only](#running-the-action-in-project-mode-only)
    - [Running the action in `gridurl` mode only](#running-the-action-in-gridurl-mode-only)
    - [Running the action in `artifact` mode only](#running-the-action-in-artifact-mode-only)
  - [License Summary](#license-summary)
  - [Security Disclosures](#security-disclosures)

<!-- tocstop -->

## Input options

- mode: **REQUIRED** The mode to execute the action in. Valid values are `project`, when you require creation or looking up of an AWS Device Farm Project ARN, `gridurl` when you wish to generate a Grid URL, or `artifact`, when you require retrieval of artifacts from an existing AWS Device Farm Project ARN.
- project-arn: **REQUIRED** The name (or arn) of the Device Farm Project. In addition to supporting the value of an ARN of an existing Project, this field supports the use of a **name** as well. For example, if `"project-arn": "Test"` is supplied, the Action will perform a lookup in the AWS Account to find and retrieve the ARN of the AWS Device Farm Project with the name `Test`. If a **name** is supplied but not found a new Project with the supplied name will be created and the ARN of that newly created Project will be used.
- url-expires-seconds: **OPTIONAL** Lifetime, in seconds, of the Test Grid URL. Defaults to 900 if not specified.
- artifact-types: **OPTIONAL** A comma-delimited list of artifacts to be downloaded after the run completes. The valid values can be found [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-device-farm/Variable/TestGridSessionArtifactCategory/). No artifacts will be downloaded if this property is not supplied.
- artifact-folder: **OPTIONAL** The name of the folder where the artifacts are downloaded. Defaults to 'artifacts' if not specified.

## Output options

- console-url: The AWS Console URL for the Test Grid Project
- project-arn: The ARN of the AWS Device Farm Browser Testing Project
- grid-url: The AWS Device Farm Test Grid URL (only available in gridurl mode)
- grid-url-expires: The Datetime that the supplied grid-url will expire formatted as YYYY-MM-DDThh:mm:ss.fffZ

## Examples of Usage

This action is designed to be used in three different ways.

1. Create or lookup an AWS Device Farm Project ARN
2. Generate a Test Grid URL for a specified a AWS Device Farm Project
3. Retrieve all the Artifacts for all sessions for a specific AWS Device Farm Project

### Before each of the following examples, make sure to include the following

> **_NOTE:_**
>
> The value of `role-to-assume` should be replaced with the AWS IAM Role to be used.
>
> The value of `aws-region` should be replaced with the AWS Region being used. Please note that AWS Device Farm is currently only available in the us-west-2 region.
>
> For more information on how to configure the `configure-aws-credentials` action please check [here](https://github.com/aws-actions/configure-aws-credentials).

```yaml
      - name: Checkout repo
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2 # More information on this action can be found below in the 'AWS Credentials' section
        with:
          role-to-assume: arn:aws:iam::123456789012:role/my-github-actions-role
          aws-region: us-west-2
```

### Creating a new AWS Device Farm Project

```yaml
      - name: Create Device Farm Project
        id: project
        uses: aws-actions/aws-devicefarm-browser-testing@v2.0
        with:
          mode: project
          project-arn: GitHubAction_${{ github.run_id }}_${{ github.run_attempt }}
```

### Lookup an existing AWS Device Farm Project

```yaml
      - name: Lookup Device Farm Project
        id: project
        uses: aws-actions/aws-devicefarm-browser-testing@v2.0
        with:
          mode: project
          project-arn: Test # A Project with name 'Test' already exists in the AWS Account in this case.
```

### Generate a Test Grid URL for an existing AWS Device Farm Project

```yaml
      - name: Generate Test Grid URL
        id: gridurl
        uses: aws-actions/aws-devicefarm-browser-testing@v2.0
        with:
          mode: gridurl
          project-arn: Test # A Project with name 'Test' already exists in the AWS Account in this case.
```

### Retrieve All artifacts

```yaml
      - name: Retrieve Device Farm Project Artifacts
        id: artifacts
        uses: aws-actions/aws-devicefarm-browser-testing@v2.0
        with:
          mode: artifact
          project-arn: Test
          artifact-types: ALL
          artifact-folder: deviceFarm

      - uses: actions/upload-artifact@v3
        if: always() # This ensures the artifacts are uploaded even if the Test Run Fails
        with:
          name: AutomatedTestOutputFiles
          path: deviceFarm
```

### Retrieve VIDEO and LOG artifacts

```yaml
      - name: Retrieve Device Farm Project Artifacts
        id: artifacts
        uses: aws-actions/aws-devicefarm-browser-testing@v2.0
        with:
          mode: artifact
          project-arn: Test
          artifact-types: VIDEO,LOG

      - uses: actions/upload-artifact@v3
        if: always() # This ensures the artifacts are retrieved even if the test(s) fails
        with:
          name: AutomatedTestOutputFiles
          path: artifacts
```

### Putting it all together with webdriver.io to execute the tests

> **_NOTE:_**
>
> Examples on how to configure your repository to use webdriver.io can be found [here](https://webdriver.io/docs/githubactions/).

```yaml
      - name: Create Device Farm Project
        id: project
        uses: aws-actions/aws-devicefarm-browser-testing@v2.0
        with:
          mode: project
          project-arn: GitHubAction_${{ github.run_id }}_${{ github.run_attempt }}

      - name: Install
        run: npm install

      - name: Test
        run: npm run test
        env:
          PROJECT_ARN: ${{ steps.project.outputs.project-arn }}

      - name: Retrieve Device Farm Project Artifacts
        id: artifacts
        uses: aws-actions/aws-devicefarm-browser-testing@v2.0
        if: always() # This ensures the artifacts are retrieved even if the test(s) fails
        with:
          mode: artifact
          project-arn: ${{ steps.project.outputs.project-arn }}
          artifact-types: ALL

      - uses: actions/upload-artifact@v3
        if: always() # This ensures the artifacts are retrieved even if the test(s) fails
        with:
          name: AutomatedTestOutputFiles
          path: artifacts
```

### Putting it all together more generically using the Test Grid Url mode

```yaml
      - name: Create Device Farm Project and generate Grid URL
        id: project
        uses: aws-actions/aws-devicefarm-browser-testing@v2.0
        with:
          mode: gridurl
          project-arn: GitHubAction_${{ github.run_id }}_${{ github.run_attempt }}

      - name: Test
        run: **TEST EXCUTION SCRIPT COMMAND HERE**
        env:
          GRID_URL: ${{ steps.project.outputs.grid-url }}
          GRID_URL_EXPIRES: ${{ steps.project.outputs.grid-url-expires }}

      - name: Retrieve Device Farm Project Artifacts
        id: artifacts
        uses: aws-actions/aws-devicefarm-browser-testing@v2.0
        if: always() # This ensures the artifacts are retrieved even if the test(s) fails
        with:
          mode: artifact
          project-arn: ${{ steps.project.outputs.project-arn }}
          artifact-types: ALL

      - uses: actions/upload-artifact@v3
        if: always() # This ensures the artifacts are retrieved even if the test(s) fails
        with:
          name: AutomatedTestOutputFiles
          path: artifacts
```

## Credentials

### AWS Credentials

This action relies on the [default behaviour of the AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html) to determine AWS credentials and region.  Use [the `aws-actions/configure-aws-credentials` action](https://github.com/aws-actions/configure-aws-credentials) to configure the GitHub Actions environment with a role using GitHub's OIDC provider and your desired region.

> **_NOTE:_**  AWS Device Farm is available in `us-west-2` region only. Therefore, it is important to specify `us-west-2` as the value of the `aws-region` property in the `configure-aws-credentials` step.

```yaml
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/my-github-actions-role
          aws-region: us-west-2

      - name: Create Device Farm Project
        id: project
        uses: aws-actions/aws-devicefarm-browser-testing@v2.0
        with:
          project-arn: GitHubAction_${{ github.run_id }}_${{ github.run_attempt }}
```

We recommend following [Amazon IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) when using AWS services in GitHub Actions workflows, including:

- [Assume an IAM role](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#bp-workloads-use-roles) to receive temporary credentials. See the [Sample IAM Role CloudFormation Template](https://github.com/aws-actions/configure-aws-credentials#sample-iam-role-cloudformation-template) in the `aws-actions/configure-aws-credentials` action to get an example.
- [Grant least privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege) to the IAM role used in GitHub Actions workflows.  Grant only the permissions required to perform the actions in your GitHub Actions workflows.  See the Permissions section below for the permissions required by this action.
- [Monitor the activity](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#remove-credentials) of the IAM role used in GitHub Actions workflows.

## Permissions

This action requires the following minimum set of permissions to run an Automated Test:

> **_NOTE:_**
>
> ${Account} should be replaced with the AWS Account Id where the test will run
>
> ${ProjectId} should be replaced with the Id of the AWS Device Farm Project being used if you wish to restrict the action to only one project, otherwise replace this with a `*`.

### Running the action in `project` mode only

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "devicefarm:ListTestGridProjects",
        "devicefarm:CreateTestGridProject"
      ],
      "Resource": "*"
    }
  ]
}
```

### Running the action in `gridurl` mode only

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "devicefarm:ListTestGridProjects"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "devicefarm:CreateTestGridUrl"
      ],
      "Resource": "arn:aws:devicefarm:us-west-2:${Account}:testgrid-project:${ProjectId}"
    }
  ]
}
```

### Running the action in `artifact` mode only

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "devicefarm:ListTestGridProjects"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "devicefarm:ListTestGridSessions"
      ],
      "Resource": "arn:aws:devicefarm:us-west-2:${Account}:testgrid-project:${ProjectId}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "devicefarm:ListTestGridSessionArtifacts"
      ],
      "Resource": [
        "arn:aws:devicefarm:us-west-2:${Account}:testgrid-project:${ProjectId}",
        "arn:aws:devicefarm:us-west-2:${Account}:testgrid-session:${ProjectId}/*"
      ]
    }
  ]
}
```

## License Summary

This code is made available under the MIT license.

## Security Disclosures

If you would like to report a potential security issue in this project, please do not create a GitHub issue.  Instead, please follow the instructions [here](https://aws.amazon.com/security/vulnerability-reporting/) or [email AWS security directly](mailto:aws-security@amazon.com).
