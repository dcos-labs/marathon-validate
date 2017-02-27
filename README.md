# marathon-validate

A tiny command line tool to validate application or group configuration files for Marathon and DC/OS.
 
## Purpose

If you're running a Mesos or DC/OS cluster and build custom applications for if, most of the time you'll have to create either a Marathon app definition JSON file, or a group definition JSON file.

As the structure of these files can get a little complicated, `marathon-validate` was created to be able to do a quick sanity check of these files from the command line.

Therefore, `marathon-validate` will use the [JSON schema files](https://github.com/mesosphere/marathon/tree/master/docs/docs/rest-api/public/api/v2/schema) contained in the Marathon GitHub project to validate the input file against.

## Installation

To be able to use `marathon-validate`, you need to have Node.js (and NPM) installed on your system. Then you can use

```bash
npm install -g marathon-validate
```

to install it globally. You can verify the correct installation by issuing 

```bash
$ marathon-validate --version
0.3.1
```

## Usage

```
$ marathon-validate --help

  Usage: marathon-validate [options] <file>

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    -a, --app                  Check an App JSON
    -g, --group                Check a Group JSON
    -d, --describe <property>  Describe a property. Has to be used with either -a (app schema) or -g (group schema)
    -m, --marathon <version>   Use schema of specific Marathon version
    -t, --tags                 Get a list of tags for the Marathon project
```

If you want validate your `application.json` file in the current folder against the `master` version of the JSON schema, you can do a 

```bash
$ marathon-validate -a application.json
```

To validate your `application.json` against a specific release version (e.g. `v1.3.6`), you can use

```bash
$ marathon-validate -a -m v1.3.6 application.json
```

This should work with all `tags` from the [Marathon project](https://api.github.com/repos/mesosphere/marathon/tags). You can also get the list of tags like this (output is shortened):

```bash
$ marathon-validate -t
List of tags:
 * v1.4.0-snap30
 * v1.4.0-snap29
 * v1.4.0-snap28
 * v1.4.0-snap27
 * v1.4.0-snap26
 * v1.4.0-snap25
 * v1.4.0-snap24
...
```