const eachAsync = require('each-async');
var jsonfile = require('jsonfile');
var _ = require('underscore');
var moment = require('moment');
var Twit = require('twit');
require('dotenv').config()

var T = new Twit({
  consumer_key:         process.env.DRB_TWIT_CONSUMER_KEY,
  consumer_secret:      process.env.DRB_JWUBOT_TWIT_CONSUMER_SECRET,
  access_token:         process.env.DRB_TWIT_ACCESS_TOKEN,
  access_token_secret:  process.env.DRB_TWIT_ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})

var hashtags = 'hashtags.json';

var hashtag_list = undefined;

// get hashtag list
hashtag_list = jsonfile.readFileSync(hashtags)

eachAsync(hashtag_list.hashtags, (hashtag, index, done) => {
  var q_tag = hashtag.tag,
      q_since = '',
      q_count = 10;
  if (typeof hashtag.last_id !== 'undefined') {
    // use date here
    q_since = hashtag.last_id;
  } else {
    q_since = hashtag.last_date;
  }

  // execute tweet
  var search_query = q_tag + ' since:' + q_since;
  T.get('search/tweets', { q: search_query, count: q_count }, function(err, data, response) {
    if (data) {
      done();

      var newfile = 'saves/' + q_tag + '_' + moment().format('MMMM_Do_YYYY_h_mm_ss_a') + '.json';
      jsonfile.writeFile(newfile, data, function (err) {
        console.error(err)
      })
    }
  })
}, error => {
  console.log('error, finished.')
})
