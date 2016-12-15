"use strict";

var fs = require("fs");
var request = require("request");
var Ajv = require('ajv');

function Schema (type, version, fileToCheck) {

    if (!(this instanceof Schema)) {
        return new Schema(type, version, fileToCheck);
    }

    var self = this;
    self.baseUrl = "https://raw.githubusercontent.com/mesosphere/marathon/%%VERSION%%/docs/docs/rest-api/public/api/v2/schema";
    self.allowedTypes = {
        "app": "AppDefinition.json",
        "group": "Group.json"
    };

    self.options = {};
    self.options.type = type || null;
    self.options.version = version || "master";
    self.options.fileToCheck = fileToCheck || null;

    self.ajv = new Ajv({ loadSchema: self.getRemoteSchema.bind(self) });

}

Schema.prototype.validate = function (callback) {

    var self = this;

    function parseValidationError (errors) {
        var errorMessages = [];
        errorMessages.push(" --> Not OK! The following errors occured during validation: ");
        if (errors) {
            errors.forEach(function (error) {
                errorMessages.push("     * '" + error.keyword + "' error. The definition of '" + error.dataPath + "' " + error.message);
            });
        }
        return errorMessages.join("\n");
    }

    var url = self.baseUrl.replace("%%VERSION%%", self.options.version) + "/" + self.allowedTypes[self.options.type];

    self.getRemoteSchema(url, function (error, schemaContents) {
        if (error) {
            callback({ message: (error.statusCode && error.statusCode === 404 ? " --> Not OK! The Marathon version '" + self.options.version + "' doesn't seem to exist! Please check..." : "An error occured while downloading the schema...") }, null);
        } else {
            self.getFile(function (error, fileContents) {
                if (error) {
                    callback(error, null);
                } else {
                    self.ajv.compileAsync(schemaContents, function (err, validate) {
                        if (err) {
                            callback(err, null);
                        }
                        var valid = validate(fileContents);
                        if (!valid) {
                            callback({ message: parseValidationError(validate.errors) }, null);
                        } else {
                            callback(null, valid);
                        }
                    });
                }
            });
        }
    });

};

Schema.prototype.getFile = function (callback) {

    var self = this;

    try {
        var file = fs.statSync(self.options.fileToCheck);
        try {
            var contents = JSON.parse(fs.readFileSync(self.options.fileToCheck, "utf8"));
            callback(null, contents);
        } catch (error) {
            callback({ message: " --> Not OK! The file couldn't be parsed as JSON!" }, null);
        }
    } catch (error) {
        callback({ message: " --> Not OK! The file '" + self.options.fileToCheck + "' couldn't be found!" }, null);
    }

};

Schema.prototype.getRemoteSchema = function (url, callback) {

    var options = {
        method: "GET",
        url: url
    };

    console.log(" --> Loading remote schema: " + options.url);

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, JSON.parse(body));
        } else {
            callback({ message: error, statusCode: response.statusCode }, null);
        }
    });

};

module.exports = Schema;
