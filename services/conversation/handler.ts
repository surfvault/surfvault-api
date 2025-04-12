import { ConversationsModel, UsersModel } from "@/database/dynamoose_models";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

// ----------------------------- CONVERSATIONS --------------------------------------
export const getConversations = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { userId } = event.pathParameters || {};
    if (!userId) {
      throw new Error("userId is required");
    }

    const databaseUser = await UsersModel.query("id").eq(userId).exec();
    console.log("databaseUser: ", databaseUser);
    if (!databaseUser.count) {
      throw new Error("User not found");
    }

    const conversations = await ConversationsModel.query("userId").eq(userId).exec();
    console.log("conversations: ", conversations);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved conversations`,
        results: {
          conversations,
          total: conversations.count,
        }
      }),
    };
  } catch (error) {
    console.error("Error getting surf media: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error getting surf media",
        error: error,
      }),
    };
  }
};
