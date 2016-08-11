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

function post_log(logstring, type) {
  console.log(logstring)
  // Build the post string from an object
  var post_data = querystring.stringify({
      'logmsg' : logstring,
      'type': type
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

/*
Send a Tweet
*/
var failcount = 0;
var last_quote = 'lq.json';
var last_quote_stream = jsonfile.readFileSync(last_quote);

var quote_list = [
  'Hello world',
  'Some non-creative quote',
  'I have no idea.',
  'Newest questions.'
]

function select_quote() {
  var sel_quote_index = _.random(0, (quote_list.length - 1));
  return quote_list[sel_quote_index];
}

function tweet_quote() {

  var sel_quote = select_quote();
  var lqstr = last_quote_stream.quote;

  if (lqstr === sel_quote) {
    failcount = failcount + 1;
    tweet_quote();
  } else {
    post_log('Selection success. Failed ' + failcount + ' times.', 2)

    T.post('statuses/update', { status: sel_quote }, function(err, data, response) {
      post_log('Attempted tweet: ' + sel_quote + ' / Twitter Response: ' + JSON.stringify(data), 2)
      var newquote = {quote: sel_quote}
      jsonfile.writeFileSync(last_quote, newquote)
    })
    failcount = 0;
  }


  return true;
}
/*
End send a Tweet
*/


retweeter = function () {
  // get hashtag list
  hashtag_list = jsonfile.readFileSync(hashtags);

  post_log('Started running retweeter()', 1);
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

      post_log('Query: ' + q_tag, 1);

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
            post_log('Attempted retweet for ' + selected_tweet.id_str, 1);
            post_log(selected_tweet.id_str + ' Response: ' +err, 1);
          });
        } else {
          post_log('Selected an undefined tweet', 1);
        }

        done();
      } else {
        // there are no tweets yet.
        post_log('No tweets for '+q_tag+' yet.', 1);
      }
    })
  }, error => {
    console.log('Finished all processes.')
    post_log('Finished all processes.', 1);
  })

  post_log('End of retweeter()', 1);
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
