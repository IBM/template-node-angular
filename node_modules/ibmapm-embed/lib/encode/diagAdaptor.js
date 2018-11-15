// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

var encoder = require('./encoder');

function addEncoder(fileContent, option){
    var contenWraper = encoder.wraper(fileContent, option);
    return contenWraper;
}

exports.addEncoder = addEncoder;
