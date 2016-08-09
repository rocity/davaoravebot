var jsonfile = require('jsonfile');

var file = 'hashtags.json';
var obj = {hashtags: ['#HomeAlone', '#foo']}

jsonfile.writeFile(file, obj, {spaces: 2}, function (err) {
    console.error(err);
})