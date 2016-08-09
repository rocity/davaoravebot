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
var logs = 'logs.json';

var hashtag_list = undefined;

retweeter = function () {
  // get hashtag list
  hashtag_list = jsonfile.readFileSync(hashtags);
  messagelogs_list = jsonfile.readFileSync(logs);

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

      if (data.statuses.length) {

        var lasttweet = _.last(data.statuses);

        // LOGGING
        var newfile = 'saves/' + q_tag + '_' + moment().format('MMMM_Do_YYYY_h_mm_ss_a') + '.json';

        // create new log message
        var msgs = messagelogs_list;
        msgs.push('Write file executed for ' + newfile);

        // create tweet data file
        jsonfile.writeFile(newfile, data, function (err) {});
        // END OF LOGGING

        // execute POST commands here

        // execute an RT for the last tweet
        T.post('statuses/retweet/:id', { id: lasttweet.id_str }, function (err, data, response) {
          msgs.push('Retweeted ' + lasttweet.id_str + ' - Timestamp: ' + moment().format());
        })

        // write message log at end of file
        jsonfile.writeFileSync(logs, msgs);
        done();
      } else {
        // there are no tweets yet.
        var msgs = messagelogs_list;
        msgs.push('No tweets yet. - Logged at ' + moment().format());
        jsonfile.writeFileSync(logs, msgs);
      }
    })
  }, error => {
    console.log('Finished all processes.')
  })
}

tweeter = function () {

}

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
    retweeterRun();
  }
  catch (e) {
    console.log(e);
  }
}, 60000 * 10); // run every 3 minutes
