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

    if (fileToCheck) {
        self.ajv = new Ajv({ loadSchema: self.getRemoteSchema.bind(self) });
    }

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

Schema.prototype.getDescription = function (propertyName, callback) {

    var self = this;
    var propertyMap = {};

    // Iterate of the schema and return the unique property names and their paths and descriptions
    function iterate(obj, stack) {
        for (var property in obj) {
            if (obj.hasOwnProperty(property)) {
                if (typeof obj[property] == "object") {
                    if (obj[property].hasOwnProperty("properties")) {
                        iterate(obj[property].properties, stack + '.' + property);
                    } else if (obj[property].hasOwnProperty("items") && obj[property].items.hasOwnProperty("properties")) {
                        iterate(obj[property].items.properties, stack + '.' + property);
                    } else {
                        if (!propertyMap.hasOwnProperty(property.toLowerCase())) {
                            propertyMap[property.toLowerCase()] = {};
                        }
                        propertyMap[property.toLowerCase()][stack + "." + property] = {
                            name: property,
                            description: (obj[property].description ? obj[property].description.replace(/\r?\n|\r/g, "") : "")
                        }
                    }
                }
            }
        }
    }

    function searchProperty(propertyName) {
        var matches = [];
        Object.getOwnPropertyNames(propertyMap).forEach(function (property) {
            if (property === propertyName) {
                Object.getOwnPropertyNames(propertyMap[property]).forEach(function (pathResult) {
                    matches.push("     * '" + pathResult + "': " + propertyMap[property][pathResult].description);
                });
            }
        });
        return matches;
    }

    var url = self.baseUrl.replace("%%VERSION%%", self.options.version) + "/" + self.allowedTypes[self.options.type];

    self.getRemoteSchema(url, function (error, schemaContents) {
        if (error) {
            callback({ message: (error.statusCode && error.statusCode === 404 ? " --> Not OK! The Marathon version '" + self.options.version + "' doesn't seem to exist! Please check..." : "An error occured while downloading the schema...") }, null);
        } else {
            if (schemaContents.properties && Object.getOwnPropertyNames(schemaContents.properties).length > 0) {
                // Iterate over schema
                iterate(schemaContents.properties, "");
                // Search for property
                var searchResults = searchProperty(propertyName.toLowerCase());
                // Evaluate results
                if (searchResults.length === 0) {
                    callback({ message: " --> Not OK! No matching property found!" }, null);
                } else {
                    callback(null, searchResults);
                }
            } else {
                callback({ message: " --> Not OK! There was a problem while getting the schema file!" }, null);
            }
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
