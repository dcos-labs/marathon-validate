"use strict";

var path = require("path");
var fs2obj = require('fs2obj');
var fs = require("fs");
var request = require("request");
var mkdirp = require('mkdirp');
var Ajv = require('ajv');
var ajv = new Ajv();

function Schema (type, version, fileToCheck) {

    if (!(this instanceof Schema)) {
        return new Schema(type, version, fileToCheck);
    }

    var self = this;
    self.schemaPath = path.join(__dirname, "../", "schema");
    self.baseUrl = "https://raw.githubusercontent.com/mesosphere/marathon/%%VERSION%%/docs/docs/rest-api/public/api/v2/schema";
    self.allowedTypes = {
        "app": "AppDefinition.json",
        "group": "Group.json"
    };

    self.options = {};
    self.options.type = type || null;
    self.options.version = version || "master";
    self.options.fileToCheck = fileToCheck || null;

    self.schema = {};
    self.schema[type] = {};
    self.schema[type].versions = {};

    self.populateFromFileSystem = function () {
        var fileObjects = fs2obj(self.schemaPath);

        fileObjects.items.forEach(function (item) {

            if (item.type === "folder" && item.items.length > 0) {

                item.items.forEach(function (file) {

                    if (file.name === self.allowedTypes[self.options.type]) {
                        self.schema[type].versions[item.name] = self.schemaPath + "/" + item.name + "/" + file.name;
                    }

                });

            }

        });

    };

    // Fill the cache
    self.populateFromFileSystem();

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

    if (self.schema[self.options.type].versions[self.options.version]) {
        console.log(" --> Using cached schema for '" + self.options.type + "' in version '" + self.options.version + "'");
        var schemaFileContents = fs.readFileSync(self.schema[self.options.type].versions[self.options.version]);

        self.getFile(function (error, fileContents) {
            if (error) {
                callback(error, null);
            } else {
                var valid = ajv.validate(JSON.parse(schemaFileContents), fileContents);
                if (!valid) {
                    callback({ message: parseValidationError(ajv.errors) }, null);
                } else {
                    callback(null, valid);
                }
            }
        });
    } else {
        console.log(" --> Loading remote schema for '" + self.options.type + "' in version '" + self.options.version + "'");
        self.getSchemaFile(function (error, schemaContents) {
            if (error) {
                callback({ message: (error.statusCode && error.statusCode === 404 ? " --> Not OK! The Marathon version '" + self.options.version + "' doesn't seem to exist! Please check..." : "An error occured while downloading the schema...") }, null);
            } else {
                self.getFile(function (error, fileContents) {
                    if (error) {
                        callback(error, null);
                    } else {
                        var valid = ajv.validate(schemaContents, fileContents);
                        if (!valid) {
                            callback({ message: parseValidationError(ajv.errors) }, null);
                        } else {
                            callback(null, valid);
                        }
                    }
                });
            }
        });
    }

};

Schema.prototype.getFile = function (callback) {

    var self = this;

    try {
        var file = fs.statSync(self.options.fileToCheck);
        try {
            var contents = JSON.parse(fs.readFileSync(self.options.fileToCheck));
            callback(null, contents);
        } catch (error) {
            callback({ message: " --> Not OK! The file couldn't be parsed as JSON!" }, null);
        }
    } catch (error) {
        callback({ message: " --> Not OK! The file '" + self.options.fileToCheck + "' couldn't be found!" }, null);
    }

};

Schema.prototype.getSchemaFile = function (callback) {

    var self = this;

    var options = {
        method: "GET",
        url: self.baseUrl.replace("%%VERSION%%", self.options.version) + "/" + self.allowedTypes[self.options.type]
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            // Folder path
            var folderPath = self.schemaPath + "/" + self.options.version;

            // Schema path
            var schemaPath = folderPath + "/" + self.allowedTypes[self.options.type];

            // Create subfolder if it doesn't exist
            mkdirp(folderPath, function (error) {
                if (error) {
                    callback({ message: " --> Not OK! The folder for the version '" + self.options.version + "' couldn't be created..." }, null);
                } else  {
                    // Store schema
                    fs.writeFileSync(schemaPath, body);

                    // Add to cache
                    self.schema[self.options.type].versions[self.options.version] = schemaPath;

                    callback(null, JSON.parse(body));
                }
            });

        } else {
            callback({ message: error, statusCode: response.statusCode }, null);
        }
    });

};

module.exports = Schema;
