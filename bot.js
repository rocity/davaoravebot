const eachAsync = require('each-async');
var jsonfile = require('jsonfile');
var _ = require('underscore');
var moment = require('moment');
var Twit = require('twit');
var async       = require('async');
// require('dotenv').config();

var T = new Twit({
  consumer_key:         process.env.DRB_TWIT_CONSUMER_KEY,
  consumer_secret:      process.env.DRB_JWUBOT_TWIT_CONSUMER_SECRET,
  access_token:         process.env.DRB_TWIT_ACCESS_TOKEN,
  access_token_secret:  process.env.DRB_TWIT_ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})

var hashtags = 'hashtags.json';

var timeformat = 'YYYY.MM.DD HH:mm:ss';

var querystring = require('querystring');
var http = require('http');
var fs = require('fs');

function post_log(logstring) {
  console.log(logstring)
  // Build the post string from an object
  var post_data = querystring.stringify({
      'logmsg' : logstring,
  });

  // An object of options to indicate where to post to
  var post_options = {
      host: process.env.DRB_LOG_POST_HOST,
      port: '80',
      path: process.env.DRB_LOG_POST_FILE,
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(post_data)
      }
  };

  // Set up the request
  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          // console.log('Response: ' + chunk);
      });
  });

  // post the data
  post_req.write(post_data);
  post_req.end();
}

retweeter = function () {
  // get hashtag list
  hashtag_list = jsonfile.readFileSync(hashtags);

  post_log('Started running retweeter()');
  eachAsync(hashtag_list.hashtags, (hashtag, index, done) => {
    var q_tag = hashtag.tag,
        q_since = '',
        q_count = 10;
    if (typeof hashtag.last_id !== 'undefined') {
      // use date here
      q_since = hashtag.last_id;
    } else {
      q_since = moment().utcOffset('+0800').format('YYYY-MM-DD');
    }

    // execute tweet
    var search_query = q_tag + ' since:' + q_since;
    T.get('search/tweets', { q: search_query, count: q_count }, function(err, data, response) {

      if (data.statuses.length) {

        // cache indexes
        var cache = _.map(new Array(data.statuses.length + 1).join(), function (item, index) {
          return index;
        });

        // get random from cached array
        var rand = _.random(0, cache.length);
        // END OF LOGGING

        // execute POST commands here

        // pluck a random tweet to be retweeted.
        if (typeof data.statuses[rand] !== 'undefined') {
          var selected_tweet = data.statuses[rand];
          T.post('statuses/retweet/:id', { id: selected_tweet.id_str }, function (err, data, response) {
            post_log('Attempted retweet for ' + selected_tweet.id_str);
            post_log(selected_tweet.id_str + ' Response: ' +err);
          });
        } else {
          post_log('Selected an undefined tweet')
        }

        done();
      } else {
        // there are no tweets yet.
        post_log('No tweets yet.');
      }
    })
  }, error => {
    console.log('Finished all processes.')
    post_log('Finished all processes.');
  })

  post_log('End of retweeter()');
}

tweeter = function () {

}

retweeter();

// set intervals
retweeterRun = function() {
  async.waterfall([
    retweeter
  ],
  function(err, botData) {

  });
};

setInterval(function() {
  try {
    console.log('Running retweeter at ' + moment().format());
    retweeterRun();
  }
  catch (e) {
    console.log(e);
  }
}, 60000 * 10); // run every 10 minutes
