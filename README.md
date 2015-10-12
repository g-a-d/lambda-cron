# lambda cron #

** NOTE ** Amazon have now announced _native_ scheduled functions for Lambda. You are very much advised to use those as opposed to this!

https://aws.amazon.com/blogs/aws/aws-lambda-update-python-vpc-increased-function-duration-scheduling-and-more/



## Introduction ##

At present, AWS Lambda has no way of setting up a scheduled invokation of a function. The 'lambda cron' project attempts to fill this gap until such time that AWS releases a task scheduler of their own.

## Quick start ##

1. Edit crontab.json, specifying a schedule in crontab format, the name of the lambda function to run, and any arguments to pass this lambda function.
2. Zip up the lambdacron function and dependencies
``` zip -r lambda_cron.zip lambda_cron.js crontab.json node_modules ```
3. Upload it to an S3 bucket of your choice
3. Run up the cloudformation build:
```aws cloudformation create-stack --stack-name lambda-cron --template-body file://lambda_cron.template --parameters ParameterKey=S3Bucket,ParameterValue=mys3bucket ParameterKey=S3Object,ParameterValue=lambda_cron.zip --capabilities CAPABILITY_IAM```
4. Once complete, hook up the new lambda function with the SNS queue manually through the AWS console
5. Poke in the initial seed value to the CloudWatch metric: ```aws cloudwatch put-metric-data --metric-name LambdaCron --namespace LambdaCron --value 1```

## How it works ##

In April 2015, it was announced that an SNS notification could now be used to trigger a Lambda function. This powerful feature allows us to use Cloudwatch alarms as a form of bistable trigger, and the trigger times of Cloudwatch alarms can be used as a pretty reliable, repeatable trigger.

The CloudFormation template in the distribution sets up an SNS topic which will trigger the lambda cron lambda function when a message is sent to this topic. We then set up a Cloudwatch alarm that sends an SNS message to this alarm both when it transitions into ALARM state and OK state.

The alarm is set to trigger after 1 minute in the new state, and the lambda cron lambda function just sets the alarm's associated metric to a value that triggers the opposite state.

So the workflow is: 
1. ALARM -> trigger lambda -> lambda sets metric to the opposite, runs any cron functions
2. one minute later, Cloudwatch notices that the metric has gone in OK state...
3. OK -> trigger lambda -> lambda sets metric to the opposite, runs any cron functions

## What about the cron jobs? ##

You specify a crontab.json file which includes the schedule (in classic crontab format), the function to run, and any arguments to pass that function (in json format).
For example, this will run the 'testfunction' function every three minutes:

```
{
  "jobs": [ {
    "schedule": "*/3 * * * *",
    "function": "testfunction",
    "args": {
      "key1": "test1",
      "key3": "test3",
      "key2": "test2"
    }
  } ]
}
```

## Questions, comments ##
guy.davies@sophos.com
