#!/usr/bin/env node

"use strict";

var pkg = require("../package.json");
var program = require("commander");
var path = require("path");
var Schema = require("../lib/schema");
var request = require("request");
var filePath = "";

program
    .version(pkg.version)
    .usage("[options] <file>")
    .option("-a, --app", "Check an App JSON")
    .option("-g, --group", "Check a Group JSON")
    .option("-m, --marathon <version>", "Use schema of specific Marathon version")
    .option("-t, --tags", "Get a list of tags for the Marathon project")
    .parse(process.argv);

if (program.args.length !== 1) {
    console.log("Please specify a file to validate!");
    process.exit(1);
} else {
    if (path.isAbsolute(program.args[0])) {
        filePath = program.args[0];
    } else {
        filePath = path.normalize(path.join(process.cwd(), program.args[0]));
    }
}

if (program.app || program.group) {

    var type = "";

    // Set type
    if (program.app) {
        type = "app";
    } else if (program.group) {
        type = "group";
    }

    var version = program.marathon || "master";

    var schema = new Schema(type, version, filePath);

    schema.validate(function (error, result) {
        if (error) {
            console.log(error.message);
            process.exit(1);
        } else if (result) {
            console.log(" --> OK! The file '" + filePath + "' is valid!");
            process.exit(0);
        }
    });
} else {
    console.log("Please either use the --app or --group flags!");
    process.exit(1);
}
