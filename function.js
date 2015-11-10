console.log('Loading function');

const https = require('https');
const url = require('url');
const slack_url = 'https://hooks.slack.com/services/';
const slack_req_opts = url.parse(slack_url);
slack_req_opts.method = 'POST';
slack_req_opts.headers = {
    'Content-Type': 'application/json'
};

exports.handler = function(event, context) {
    (event.Records || []).forEach(function(rec) {
        if (rec.Sns) {
            var req = https.request(slack_req_opts, function(res) {
                if (res.statusCode === 200) {
                    context.succeed('posted to slack');
                } else {
                    context.fail('status code: ' + res.statusCode);
                }
            });

            req.on('error', function(e) {
                console.log('problem with request: ' + e.message);
                context.fail(e.message);
            });

            var message = JSON.parse(rec.Sns.Message);
            var obj;

            if (message.AlarmName) {
                var status = message.NewStateValue;
                var color;
                if (status === "ALARM") {
                    status = ":exclamation: " + status;
                    color = "#FF0000";
                }
                if (status === "OK") {
                    status = ":+1: " + status;
                    color = "#7CD197";
                }
                var str = "*" +
                    status +
                    ": " +
                    message.AlarmDescription +
                    "*";

                obj = {
                    text: str,
                    username: "CloudWatch",
                    attachments: [{
                        fallback: message,
                        color: color,
                        fields: [{
                            title: "Alarm",
                            value: message.NewStateReason,
                            short: true
                        }, {
                            title: "Status",
                            value: message.NewStateValue,
                            short: true
                        }]
                    }]
                }
            } else if (message.AutoScalingGroupName) {
                switch (message.Event) {
                    case "autoscaling:TEST_NOTIFICATION":
                        obj = {
                            username: "EC2 Autoscaling",
                            attachments: [{
                                fallback: message,
                                pretext: "Test notification @here",
                                fields: [{
                                    title: "AutoScalingGroupName",
                                    value: message.AutoScalingGroupName
                                }, {
                                    title: "RequestId",
                                    value: message.RequestId
                                }, {
                                    title: "AutoScalingGroupARN",
                                    value: message.AutoScalingGroupARN
                                }, {
                                    title: "Time",
                                    value: message.Time
                                }]
                            }]
                        }
                        break;
                    case "autoscaling:EC2_INSTANCE_LAUNCH":
                        obj = {
                            username: "EC2 Autoscaling",
                            attachments: [{
                                failback: message,
                                pretext: "Launching a new instance @here",
                                color: "#7CD197",
                                fields: [{
                                    title: "AutoScalingGroupName",
                                    value: message.AutoScalingGroupName
                                }, {
                                    title: "Description",
                                    value: message.Description
                                }]
                            }]
                        }
                        break;
                    case "autoscaling:EC2_INSTANCE_TERMINATE":
                        obj = {
                            username: "EC2 Autoscaling",
                            attachments: [{
                                    failback: message,
                                    pretext: "Terminating instance @here",
                                    color: "#F35A00",
                                    fields: [{
                                        title: "AutoScalingGroupName",
                                        value: message.AutoScalingGroupName
                                    }, {
                                        title: "Description",
                                        value: message.Description
                                    }]
                                }

                            ]
                        }
                        break;
                    default:
                        obj = {
                            username: "EC2 Autoscaling",
                            attachments: [{
                                failback: message,
                                pretext: "Caution! @here",
                                color: "#FF0000",
                                fields: [{
                                    title: "AutoScalingGroupName",
                                    value: message.AutoScalingGroupName
                                }, {
                                    title: "Description",
                                    value: message.Description
                                }]
                            }]
                        }
                        break;
                }
            } else {

            }

            req.write(JSON.stringify(obj));

            req.end();
        }
    });
};
