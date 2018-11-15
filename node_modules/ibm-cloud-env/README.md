# IBM Cloud Environment

[![IBM Cloud powered][img-ibmcloud-powered]][url-cloud]
[![Travis][img-travis-master]][url-travis-master]
[![Coveralls][img-coveralls-master]][url-coveralls-master]
[![Codacy][img-codacy]][url-codacy]
[![Version][img-version]][url-npm]
[![DownloadsMonthly][img-npm-downloads-monthly]][url-npm]
[![DownloadsTotal][img-npm-downloads-total]][url-npm]
[![License][img-license]][url-npm]
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

[img-ibmcloud-powered]: https://img.shields.io/badge/IBM%20Cloud-powered-blue.svg
[url-cloud]: http://bluemix.net
[url-npm]: https://www.npmjs.com/package/ibm-cloud-env
[img-license]: https://img.shields.io/npm/l/ibm-cloud-env.svg
[img-version]: https://img.shields.io/npm/v/ibm-cloud-env.svg
[img-npm-downloads-monthly]: https://img.shields.io/npm/dm/ibm-cloud-env.svg
[img-npm-downloads-total]: https://img.shields.io/npm/dt/ibm-cloud-env.svg

[img-travis-master]: https://travis-ci.org/ibm-developer/ibm-cloud-env.svg?branch=master
[url-travis-master]: https://travis-ci.org/ibm-developer/ibm-cloud-env/branches

[img-coveralls-master]: https://coveralls.io/repos/github/ibm-developer/ibm-cloud-env/badge.svg
[url-coveralls-master]: https://coveralls.io/github/ibm-developer/ibm-cloud-env

[img-codacy]: https://api.codacy.com/project/badge/Grade/e3ecd6926e134c69bcb9d69ece5b4f3f?branch=master
[url-codacy]: https://www.codacy.com/app/ibm-developer/ibm-cloud-env

The `ibm-cloud-env` module allows to abstract environment variables from various Cloud compute providers, such as, but not limited to, CloudFoundry and Kubernetes, so the application could be environment-agnostic.

The module allows to define an array of search patterns that will be executed one by one until required value is found.

### Installation

```bash
npm install ibm-cloud-env
```
 
### Usage

Create a JSON file containing your mappings and initialize the module

```javascript
const IBMCloudEnv = require('ibm-cloud-env');
IBMCloudEnv.init("/path/to/the/mappings/file/relative/to/prject/root");
```

In case mappings file path is not specified in the `IBMCloudEnv.init()` the module will try to load mappings from a default path of `/server/config/mappings.json`.
 
#### Supported search patterns types
ibm-cloud-config supports searching for values using three search pattern types - user-provided, cloudfoundry, env, file. 
- Using `user-provided` allows to search for values in VCAP_SERVICES for service credentials
- Using `cloudfoundry` allows to search for values in VCAP_SERVICES and VCAP_APPLICATIONS environment variables
- Using `env` allows to search for values in environment variables
- Using `file` allows to search for values in text/json files

#### Example search patterns
- user-provided:service-instance-name:credential-key - searches through parsed VCAP_SERVICES environment variable and returns the value of the requested service name and credential
- cloudfoundry:service-instance-name - searches through parsed VCAP_SERVICES environment variable and returns the `credentials` object of the matching service instance name
- cloudfoundry:$.JSONPath - searches through parsed VCAP_SERVICES and VCAP_APPLICATION environment variables and returns the value that corresponds to JSONPath
- env:env-var-name - returns environment variable named "env-var-name"
- env:env-var-name:$.JSONPath - attempts to parse the environment variable "env-var-name" and return a value that corresponds to JSONPath
- file:/server/config.text - returns content of /server/config.text file
- file:/server/config.json:$.JSONPath - reads the content of /server/config.json file, tries to parse it, returns the value that corresponds to JSONPath

#### mappings.json file example
```javascript
{
    "service1-credentials": {
        "searchPatterns": [
            "user-provided:my-service1-instance-name:service1-credentials",
            "cloudfoundry:my-service1-instance-name", 
            "env:my-service1-credentials", 
            "file:/localdev/my-service1-credentials.json" 
        ]
    },
    "service2-username": {
        "searchPatterns":[
            "user-provided:my-service2-instance-name:username",
            "cloudfoundry:$.service2[@.name=='my-service2-instance-name'].credentials.username",
            "env:my-service2-credentials:$.username",
            "file:/localdev/my-service1-credentials.json:$.username" 
        ]
    }
}
```

### Using the values in application

In your application retrieve the values using below commands

```javascript
var service1credentials = IBMCloudEnv.getDictionary("service1-credentials"); // this will be a dictionary
var service2username = IBMCloudEnv.getString("service2-username"); // this will be a string
```

Following the above approach your application can be implemented in an runtime-environment agnostic way, abstracting differences in environment variable management introduced by different cloud compute providers.

### Filter the values for tags and labels

In your application, you can filter credentials generated by the module based on service tags and service labels.

```javascript
var filtered_credentials = IBMCloudEnv.getCredentialsForServiceLabel('tag', 'label', credentials)); // returns a Json with credentials for specified service tag and label
```

## Publishing Changes

In order to publish changes, you will need to fork the repository or ask to join the `ibm-developer` org and branch off the `master` branch.

Make sure to follow the [conventional commit specification](https://conventionalcommits.org/) before contributing. To help you with commit a commit template is provide. Run `config.sh` to initialize the commit template to your `.git/config` or use [commitizen](https://www.npmjs.com/package/commitizen)

Once you are finished with your changes, run `npm test` to make sure all tests pass.

Do a pull request against `master`, make sure the build passes. A team member will review and merge your pull request.
Once merged to `master` an auto generated pull request will be created against master to update the changelog. Make sure that the CHANGELOG.md and the package.json is correct before merging the pull request. After the auto generated pull request has been merged to `master` the version will be bumped and published to npm. 
