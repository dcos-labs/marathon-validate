"use strict";

var request = require("request");

function Tags () {

    if (!(this instanceof Tags)) {
        return new Tags();
    }

}

Tags.prototype.getList = function (callback) {
    request({
        method: "GET",
        uri:"https://api.github.com/repos/mesosphere/marathon/tags?per_page=100",
        headers: {
            "User-Agent": "marathon-validate"
        }
    }, function (error, response, body) {
        var tags = [];
        if (!error && response.statusCode == 200) {
            var res = JSON.parse(body);
            if (res && Array.isArray(res) && res.length > 0) {
                res.forEach(function (tagObj) {
                    tags.push(" * " + tagObj.name);
                });
                callback(null, tags);
            } else {
                callback(" --> Not OK! Couldn't find any tags!", null);
            }
        } else {
            callback(" --> Not OK! Error occurred when requesting tags!", null);
        }
    });
};

module.exports = Tags;