const eachAsync = require('each-async');
var jsonfile = require('jsonfile');
var _ = require('underscore');
var moment = require('moment');
var Twit = require('twit');
var async = require('async');
var querystring = require('querystring');
var http = require('http');
var fs = require('fs');

// Environment variables using .env (Optimal for develop stage)
require('dotenv').config();

// Initialize Twit
var T = new Twit({
  consumer_key:         process.env.DRB_TWIT_CONSUMER_KEY,
  consumer_secret:      process.env.DRB_JWUBOT_TWIT_CONSUMER_SECRET,
  access_token:         process.env.DRB_TWIT_ACCESS_TOKEN,
  access_token_secret:  process.env.DRB_TWIT_ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})

var hashtags = 'hashtags.json';
var quotes = 'quotes.json';

var timeformat = 'YYYY.MM.DD HH:mm:ss';
var generaltag = ' #Kadayawan2016 ';

/*
Send a Tweet
*/
var failcount = 0;
var last_quote = 'lq.json';
var last_quote_stream = jsonfile.readFileSync(last_quote);

var quote_array = [];

var tag_array = [];

// Select a random hashtag from the `tag_array` variable
function select_tag() {
  var sel_tag_index = _.random(0, (tag_array.length - 1));
  return tag_array[sel_tag_index];
}

// Select a random quote from `quotes.json`. If it does not exist,
// select_quote() will select from the variable `quote_array` instead
function select_quote() {
  quotefile_list = jsonfile.readFileSync(quotes);

  if (typeof quotefile_list.quotes !== "undefined" && quotefile_list.quotes.length > 0) {
    quote_list = quotefile_list.quotes;
  } else {
    quote_list = quote_array;
  }

  var sel_quote_index = _.random(0, (quote_list.length - 1));

  return quote_list[sel_quote_index] + generaltag + select_tag() ;
}

// Send the selected quote to the Twitter API
function tweet_quote() {

  var datex = moment().utcOffset('+0800').format('YYYY-MM-DD');

  var sel_quote = select_quote();
  var lqstr = last_quote_stream.quote;

  if (lqstr === sel_quote) {
    failcount = failcount + 1;
    tweet_quote();
  } else {
    if (datex === '2016-08-20') {
      T.post('statuses/update', { status: sel_quote }, function(err, data, response) {
        var newquote = {quote: sel_quote}
        jsonfile.writeFileSync(last_quote, newquote)
      })
    }
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

  eachAsync(hashtag_list.hashtags, function(hashtag, index, done) {
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
          });
        } else {
        }

        done();
      } else {
        // there are no tweets yet.
      }
    })
  }, error => {
  })

}

tweeter = function () {

}

retweeter();
tweet_quote();

// set intervals
retweeterRun = function() {
  async.waterfall([
    retweeter
  ],
  function(err, botData) {

  });
};

tweeterRun = function() {
  async.waterfall([
    tweet_quote
  ],
  function(err, botData) {

  });
};

// Retweet tweets with hashtag x
setInterval(function() {
  try {
    retweeterRun();
  }
  catch (e) {
  }
}, 60000 * 10); // run every 10 minutes

// Tweet out random quotes
setInterval(function() {
  try {
    tweeterRun();
  }
  catch (e) {
  }
}, 60000 * 30); // run every 1 minutes
