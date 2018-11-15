/*
 * © Copyright IBM Corp. 2017, 2018
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Log4js = require("log4js");
const fs = require("fs");
const _ = require("underscore");
const jsonpath = require('jsonpath');
const DEFAULT_LOG_LEVEL = Log4js.levels.INFO;
const PREFIX_PATTERN_FILE = "file";
const PREFIX_PATTERN_CF = "cloudfoundry";
const PREFIX_PATTERN_ENV = "env";
const PREFIX_PATTERN_USER = "user-provided";

const loadedFiles = []; // keep track so we don't re-read the filesystem unnecessarily
const loadedMappings = {};

function IBMCloudEnv() {

	
	const logger = Log4js.getLogger("ibm-cloud-env");
	logger.level = DEFAULT_LOG_LEVEL;

	function init(mappingsFilePath) {
		logger.trace("init", mappingsFilePath);
		mappingsFilePath = mappingsFilePath || "/server/config/mappings.json";
		mappingsFilePath = process.cwd() + mappingsFilePath;

		if (loadedFiles.includes(mappingsFilePath)) {
			logger.trace("already loaded", mappingsFilePath);
			return;
		}

		// we don't care if it fails or not, we just don't bother
		// retrying either way, so we put it in the array:
		loadedFiles.push(mappingsFilePath);

		logger.info("Initializing with", mappingsFilePath);
		if (!fs.existsSync(mappingsFilePath)) {
			logger.warn("File does not exist", mappingsFilePath);
			return;
		}

		let mappingsJson = JSON.parse(fs.readFileSync(mappingsFilePath, "UTF8"));
		let version = mappingsJson.version;
		delete mappingsJson.version;
		if (version === 1) {
			_.each(mappingsJson, function (value, key) {
				processMapping(key, value);
			});
		} else if (version === 2) {
			_.each(mappingsJson, function (value, key) {
				processMappingV2(key, value);
			});
		} else {
			// default to version 1 if not version can be found
			_.each(mappingsJson, function (value, key) {
				processMapping(key, value);
			});
		}
	}

	function processMapping(mappingName, config) {
		logger.trace("processMapping", mappingName, config);

		if (!config.searchPatterns || config.searchPatterns.length === 0) {
			logger.warn(`No credentials found using searchPatterns under ${mappingName} skipping...`);
			return;
		}
		config.searchPatterns.every(function (searchPattern) {
			logger.debug("mapping name", mappingName, "search pattern", searchPattern);
			let value = processSearchPattern(mappingName, searchPattern);
			if (value) {
				loadedMappings[mappingName] = (_.isObject(value)) ? JSON.stringify(value) : value;
				return false;
			} else {
				return true;
			}
		});

		logger.debug(mappingName, "=", loadedMappings[mappingName]);
	}

	function processMappingV2(mappingName, config) {
		logger.trace("processMappingV2", mappingName, config);

		let keys = Object.keys(config);

		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];

			if (!config[key].searchPatterns || config[key].searchPatterns.length === 0) {
				logger.warn(`No credentials found using searchPatterns under ${mappingName} skipping...`);
				return;
			}

			config[key].searchPatterns.every(function (searchPattern) {
				logger.debug(`mapping ${mappingName}[${key}] with seachPatterns ${searchPattern}`);
				let value = processSearchPattern(`${mappingName}[${key}]`, searchPattern);
				if (value) {
					loadedMappings[mappingName] = loadedMappings[mappingName] || {};
					loadedMappings[mappingName][key] = (_.isObject(value)) ? JSON.stringify(value) : value;
					return false;
				} else {
					return true;
				}
			});

			logger.debug(mappingName, "=", loadedMappings[mappingName]);

		}
	}

	function processSearchPattern(mappingName, searchPattern) {
		logger.trace("processSearchPattern", mappingName, searchPattern);
		let patternComponents = searchPattern.split(":");
		let value = null;

		switch (patternComponents[0]) {
			case PREFIX_PATTERN_FILE:
				value = processFileSearchPattern(patternComponents);
				break;
			case PREFIX_PATTERN_CF:
				value = processCFSearchPattern(patternComponents);
				break;
			case PREFIX_PATTERN_ENV:
				value = processEnvSearchPattern(patternComponents);
				break;
			case PREFIX_PATTERN_USER:
				value = processUserProvidedSearchPattern(patternComponents);
				break;
			default:
				logger.warn("Unknown searchPattern prefix", patternComponents[0], "Supported prefixes: cloudfoundry, env, file, user-provided");
		}

		return value;
	}

	function processFileSearchPattern(patternComponents) {
		logger.trace("processFileSearchPattern", patternComponents);
		let filePath = process.cwd() + patternComponents[1];
		if (!fs.existsSync(filePath)) {
			logger.error("File does not exist", filePath);
			return;
		}

		let fileContent = fs.readFileSync(filePath, "UTF8");
		if (patternComponents.length == 3) {
			return processJSONPath(fileContent, patternComponents[2]);
		} else {
			return fileContent;
		}
	}

	function processCFSearchPattern(patternComponents) {
		logger.trace("processCFSearchPattern", patternComponents);
		let vcapServicesString = process.env.VCAP_SERVICES;
		let vcapApplicationString = process.env.VCAP_APPLICATION;
		if (_.isUndefined(vcapServicesString) || _.isUndefined(vcapApplicationString)) {
			return;
		}
		if (patternComponents[1][0] === "$") {
			// patternComponents[1] is a JSONPath, try to get it from VCAP_SERVICES and VCAP_APPLICATION
			let value = processJSONPath(vcapServicesString, patternComponents[1]);
			if (!_.isUndefined(value)) {
				return value;
			} else {
				return processJSONPath(vcapApplicationString, patternComponents[1]);
			}
		} else {
			// patternComponents[1] is a service instance name, find it in VCAP_SERVICES and return credentials object
			let jsonPath = '$..[?(@.name=="' + patternComponents[1] + '")].credentials';
			return processJSONPath(vcapServicesString, jsonPath);
		}
	}

	function processEnvSearchPattern(patternComponents) {
		logger.trace("processEnvSearchPattern", patternComponents);
		let value = process.env[patternComponents[1]];
		if (value && patternComponents.length === 3) {
			value = processJSONPath(value, patternComponents[2]);
		}
		return value;
	}

	function processUserProvidedSearchPattern(patternComponents) {
		logger.trace("processUserProvidedSearchPattern", patternComponents);
		let vcapServicesString = process.env.VCAP_SERVICES;
		if (_.isUndefined(vcapServicesString)) {
			return;
		}
		if (patternComponents.length === 3) {

			let servicename = patternComponents[1];

			let credthing = processJSONCredentials(vcapServicesString, servicename, patternComponents[2]);
			return credthing;
		}
		return;
	}

	// process JSON for user-provided credentials
	function processJSONCredentials(jsonString, servicename, credkey) {
		logger.trace("processJSONPath", jsonString, servicename, credkey);
		try {
			let jsonObj = JSON.parse(jsonString);
			let credsArray = jsonObj[PREFIX_PATTERN_USER];

			for (let i in credsArray) {
				if (credsArray[i].name === servicename) {

					let path = "$.." + credkey;
					let cred = jsonpath.query(credsArray[i], path);

					return cred ? cred[0] : null;
				}
			}
			return;
		} catch (e) {
			logger.debug(e);
			logger.error("Failed to apply JSONPath", jsonString);
		}
	}

	function processJSONPath(jsonString, jsonPath) {
		logger.trace("processJSONPath", jsonString, jsonPath);
		try {
			let jsonObj = JSON.parse(jsonString);
			return jsonpath.value(jsonObj, jsonPath);
		} catch (e) {
			logger.debug(e);
			logger.error("Failed to apply JSONPath", jsonString, jsonPath);
		}
	}

	/**
	 * Returns all the credentials that match the service tag and label from
	 * `localdev-config.json`.
	 * @param {string} serviceTag The service tag (e.g, Watson)
	 * @param {string} serviceLabel The service label (e.g, Conversation)
	 * @param {object} credentials The JSON object including all the credentials for starter
	 */
	function getCredentialsForService(serviceTag, serviceLabel, credentials) {
		const creds = {};
		const key = `${serviceTag}_${serviceLabel}_`;
		if (credentials) {
			Object.keys(credentials)
				.filter(c => c.indexOf(key) === 0)
				.forEach(k => {
					if (k.substr(key.length) === 'apikey' && serviceTag === 'watson') {
						creds[`iam_${k.substr(key.length)}`] = credentials[k]
					}
					else {
						creds[k.substr(key.length)] = credentials[k]
					}
				});
		}
		return creds;
	}

	function setLogLevel(level) {
		logger.level = level;
	}

	function getString(name) {
		return loadedMappings[name];
	}

	function getDictionary(name) {
		let value = getString(name);
		try {
			return JSON.parse(value);
		} catch (e) {
			if (typeof (value) === 'object') {
				return value;
			}
			return {
				value: value
			}
		}
	}

	return {
		init: init,
		getString: getString,
		getDictionary: getDictionary,
		setLogLevel: setLogLevel,
		getCredentialsForService,
	};
}

module.exports = IBMCloudEnv();
