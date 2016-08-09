const eachAsync = require('each-async');
var jsonfile = require('jsonfile');
var _ = require('underscore');
var moment = require('moment');
var Twit = require('twit');
// require('dotenv').config();

var T = new Twit({
  consumer_key:         process.env.DRB_TWIT_CONSUMER_KEY,
  consumer_secret:      process.env.DRB_JWUBOT_TWIT_CONSUMER_SECRET,
  access_token:         process.env.DRB_TWIT_ACCESS_TOKEN,
  access_token_secret:  process.env.DRB_TWIT_ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})

var hashtags = 'hashtags.json';
var logs = 'logs.json';

var timeformat = 'YYYY.MM.DD HH:mm:ss';

var hashtag_list = undefined;

// returns a string (intented for use on logs)
function timestamp(msg) {
  console.log('[' + moment().format(timeformat) +'] ' + msg);
  return '[' + moment().format(timeformat) +'] ' + msg;
}

retweeter = function () {
  // get hashtag list
  hashtag_list = jsonfile.readFileSync(hashtags);
  messagelogs_list = jsonfile.readFileSync(logs);
  var msgs = messagelogs_list;

  timestamp('Started running retweeter()');
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
        timestamp('Write file executed for ' + newfile);

        // create tweet data file
        // README: remove this to not overpopulate the heroku repo
        // jsonfile.writeFile(newfile, data, function (err) {});

        // END OF LOGGING

        // execute POST commands here

        // execute an RT for the last tweet
        T.post('statuses/retweet/:id', { id: lasttweet.id_str }, function (err, data, response) {
          timestamp('Retweeted ' + lasttweet.id_str);
        })

        // write message log at end of file
        jsonfile.writeFileSync(logs, msgs);
        done();
      } else {
        // there are no tweets yet.
        var msgs = messagelogs_list;
        timestamp('No tweets yet.');
      }
    })
  }, error => {
    console.log('Finished all processes.')
    timestamp('Finished all processes.');
  })

  timestamp('End of retweeter()');
  // README: remove this to not overpopulate the heroku repo
  // jsonfile.writeFileSync(logs, msgs);
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
