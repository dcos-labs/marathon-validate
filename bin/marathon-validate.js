#!/usr/bin/env node

"use strict";

var pkg = require("../package.json");
var path = require("path");
var os = require("os");
var program = require("commander");
var Schema = require("../lib/schema");
var Tags = require("../lib/tags");
var filePath = "";

program
    .version(pkg.version)
    .usage("[options] <file>")
    .option("-a, --app", "Check an App JSON")
    .option("-g, --group", "Check a Group JSON")
    .option("-d, --describe <property>", "Describe a property. Has to be used with either -a (app schema) or -g (group schema)")
    .option("-m, --marathon <version>", "Use schema of specific Marathon version")
    .option("-t, --tags", "Get a list of tags for the Marathon project")
    .parse(process.argv);

if (program.describe && (program.app || program.group)) {
    var type = "";

    // Set type
    if (program.app) {
        type = "app";
    } else if (program.group) {
        type = "group";
    }

    var version = program.marathon || "master";

    // Describe process
    var describeSchema = new Schema(type, version, null);

    describeSchema.getDescription(program.describe, function (error, result) {
        if (error) {
            console.log(error.message);
            process.exit(1);
        } else if (result) {
            console.log(" --> Found " + result.length + " matches for '" + program.describe + "':");
            console.log(result.join("\n"));
            process.exit(0);
        }
    });
} else if (program.tags) {
    // https://api.github.com/repos/mesosphere/marathon/tags?per_page=100
    var tags = new Tags();
    tags.getList(function(error, tags) {
        if (error) {
            console.log(error);
            process.exit(1);
        } else {
            if (tags.length > 0) {
                console.log(" --> List of tags:");
                console.log(tags.join(os.EOL));
            }
        }
    })
} else {

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

}
