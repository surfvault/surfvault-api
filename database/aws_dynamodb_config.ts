import dynamoose from "dynamoose";

// Create new DynamoDB instance
const ddb = new dynamoose.aws.ddb.DynamoDB({
    "credentials": {
        "accessKeyId": "AKIAYSE4OLNQKMIINFRZ", // ************* REMOVE ***********************************
        "secretAccessKey": "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" // ************* REMOVE ***********************************
    },
    "region": "us-east-1"
});

// Set DynamoDB instance to the Dynamoose DDB instance
dynamoose.aws.ddb.set(ddb);