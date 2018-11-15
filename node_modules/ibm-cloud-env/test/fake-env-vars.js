process.env.VCAP_SERVICES = JSON.stringify({
	"service1": [
		{
			name: "service1-name1",
			credentials: {
				username: "service1-username1"
			}
		},
		{
			name: "service1-name2",
			credentials: {
				username: "service1-username2"
			}
		}
	],
	"user-provided": [
		{
			"credentials":{
				"apikey": "apikey1"
			},
			"name":"servicename1"
			
		},
		{
			"credentials":{
				"writer":{
					"apikey": "apikey2"
				}
			},
			"name":"servicename2"
		},
		{
			"credentials":{
				"apikey": "apikey3",
				"nestedCreds": {
					"nestedKey1": "nestedValue1",
					"nestedKey2": {
						"nestedKey3": "nestedValue3"
					},
				}
			},
			"name":"servicename3"
		}
	]
});

process.env.VCAP_APPLICATION = JSON.stringify({
	"application_name": "test-application"
});

process.env.ENV_VAR_STRING = "test-12345";
process.env.ENV_VAR_JSON = JSON.stringify({
	credentials: {
		username: "env-var-json-username"
	}
});

