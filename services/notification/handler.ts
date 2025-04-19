import { NotificationsModel, UsersModel } from "@/database/dynamoose_models";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

export const getNotifications = async (
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

    const notifications = await NotificationsModel.query("userId").eq(userId).exec();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved notifications`,
        results: {
          notifications,
          total: notifications.length,
        }
      }),
    };
  } catch (error) {
    console.error("Error getting notifications: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error getting notifications",
        error: error,
      }),
    };
  }
};