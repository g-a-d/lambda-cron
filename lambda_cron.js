console.log('Loading function');

var AWS = require('aws-sdk');
var parser = require('cron-parser');

var crontab = [ { schedule: "*/3 * * * *",
                  function: "testfunction",
                  args: "123" } ];


exports.handler = function(event, context) {
    var date_zeroSeconds = new Date();
    date_zeroSeconds.setSeconds(0);
    date_zeroSeconds.setMilliseconds(0);
    for (job in crontab) {
            console.log("job is",crontab[job]);
            console.log("schedule is",crontab[job]["schedule"]);
            var options = {currentDate: date_zeroSeconds};
            var interval = parser.parseExpression(crontab[job]["schedule"],options);
            var runtime = interval.next();
            // coerce both date_zeroSeconds and runtime into a string with seconds
            datestring = JSON.stringify(date_zeroSeconds);
            runtimestring = JSON.stringify(runtime);
            if (datestring == runtimestring) {
                        var lambda = new AWS.Lambda();
                        var params = {
                                FunctionName: crontab[job]["function"],
                                InvocationType: "Event",
                                Payload: crontab[job]["args"]
                        };
                        lambda.invoke(params, function(err,data) {
                                 if (err) console.log(err, err.stack);
                                 else console.log(data);
                        });
            }
            else {
                    console.log("Not running job as not scheduled for it");
            }
    }
    var cloudwatch = new AWS.CloudWatch();
    var value = 0.0;
    var snsmessage = JSON.parse(event.Records[0].Sns.Message);
    console.log('newstatevalue is: ',snsmessage.NewStateValue);
    if (snsmessage.NewStateValue == 'ALARM') { value = 0.0 }
    else if (snsmessage.NewStateValue == 'OK' || snsmessage.NewStateValue == 'INSUFFICIENT_DATA') { value = 1.0 }
    var params = { MetricData: [    { MetricName: 'lambda_cron', Timestamp: new Date,  Unit: 'None', Value: value } ], Namespace: 'lambda_cron' };
    cloudwatch.putMetricData(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
        context.succeed();
    });
};
