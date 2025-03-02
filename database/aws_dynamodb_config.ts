import dynamoose from "dynamoose";

// Create new DynamoDB instance
const ddb = new dynamoose.aws.ddb.DynamoDB({
    "credentials": {
        "accessKeyId": process.env.AWS_KEY_ID,
        "secretAccessKey": process.env.AWS_KEY_SECRET
    },
    "region": "us-east-1"
});

// Set DynamoDB instance to the Dynamoose DDB instance
dynamoose.aws.ddb.set(ddb);