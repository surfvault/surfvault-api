import {
    DeleteMessageCommand,
    ReceiveMessageCommand,
    SQSClient,
    SQSClientConfig,
    SendMessageCommand,
} from "@aws-sdk/client-sqs";

export class SQSService {
    private static _client: SQSClient | null = null;

    public static _getSqs() {
        if (SQSService._client) {
            return SQSService._client;
        }

        const options: SQSClientConfig = {
            region: process.env.AWS_REGION,
        };

        return (SQSService._client = new SQSClient(options));
    }

    public static clearSqs() {
        SQSService._client = null;
    }

    public static async sendMessage(queueUrl: string, message: string) {
        console.log("Sending message to queue", queueUrl, message);
        const client = SQSService._getSqs();
        const command = new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: message,
        });

        try {
            return await client.send(command);
        } catch (err) {
            console.error("Error sending message to queue", err);
            throw err;
        }
    }

    public static async receiveMessage(
        queueUrl: string,
        numberOfMessages: number = 1
    ) {
        console.log("Sending message to queue", queueUrl);
        const client = SQSService._getSqs();
        const command = new ReceiveMessageCommand({
            AttributeNames: ["SentTimestamp"],
            MaxNumberOfMessages: numberOfMessages,
            MessageAttributeNames: ["All"],
            QueueUrl: queueUrl,
            WaitTimeSeconds: 10,
            VisibilityTimeout: 10,
        });

        try {
            return await client.send(command);
        } catch (err) {
            console.error("Error receiving message to queue", err);
            throw err;
        }
    }

    public static async deleteMessage(queueUrl: string, receiptHandle: string) {
        console.log("Sending message to queue", queueUrl);
        const client = SQSService._getSqs();
        const command = new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle,
        });

        try {
            return await client.send(command);
        } catch (err) {
            console.error("Error deleting message from queue", err);
            throw err;
        }
    }
}
