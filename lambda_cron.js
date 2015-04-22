console.log('Loading function');

var AWS = require('aws-sdk');
var parser = require('cron-parser');
var async = require('async');
var fs = require('fs');


var crontab = [ { schedule: "*/3 * * * *",
                  function: "testfunction",
                  args: "123" } ];


function read_config(callback) {
   fs.readFile('crontab.json', 'utf8', function(err,file) {
       if (err) {
          callback(err);
       }
       else {
          crontab = JSON.parse(file);
          callback(null,crontab);
       } 
    });
}

function flip_cloudwatch(callback, crontab) {
    var cloudwatch = new AWS.CloudWatch();
    var value = 0.0;
    var snsmessage = JSON.parse(event.Records[0].Sns.Message);
    console.log('newstatevalue is: ',snsmessage.NewStateValue);
    if (snsmessage.NewStateValue == 'ALARM') { value = 0.0 }
    else if (snsmessage.NewStateValue == 'OK' || snsmessage.NewStateValue == 'INSUFFICIENT_DATA') { value = 1.0 }
    var params = { MetricData: [    { MetricName: 'lambda_cron', Timestamp: new Date,  Unit: 'None', Value: value } ], Namespace: 'lambda_cron' };
    cloudwatch.putMetricData(params, function(err, data) {
        if (err) callback(err); 
        else     callback(null,crontab);           // successful response
    });
}

function execute_lambdas(callback, crontab) {
    var d = new Date().setSeconds(0);
    d.setMilliseconds(0);
    async.each(crontab['jobs'], function(job,iteratorcallback) { 
            console.log("job is",job);
            console.log("schedule is",job["schedule"]);
            var options = {currentDate: d};
            var interval = parser.parseExpression(job["schedule"],options);
            var runtime = interval.next();
            // coerce both d and runtime into a string with seconds
            datestring = JSON.stringify(d);
            runtimestring = JSON.stringify(runtime);
            if (datestring == runtimestring) {
                        var lambda = new AWS.Lambda();
                        var params = {
                                FunctionName: job["function"],
                                InvocationType: "Event",
                                Payload: job["args"]
                        };
                        lambda.invoke(params, function(err,data) {
                                 if (err) iteratorcallback(err);
                                 else iteratorcallback(null);
                        });
            }
            else {
                    console.log("Not running job as not scheduled for it");
            }
    }, function(err) {
            if (err) callback(err);
            else callback(null);
    });
}



exports.handler = function(event, context) {

  async.waterfall([
     read_crontab;
     flip_cloudwatch;
     execute_lambdas;
  ], function (err) {
           if (err) context.fail(err);
           else context.succeed(); });
};
