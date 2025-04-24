import { NotificationsModel, SurfBreaksModel, UsersModel } from "@/database/dynamoose_models";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';

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

    const notifications = await NotificationsModel.query("userId").eq(userId).where("read").eq(false).exec();
    console.log("notifications: ", notifications);

    const sortedNotifications = notifications.sort((a, b) => b.updatedAt - a.updatedAt);

    const resourcePopulatedNotifications = await Promise.all(
      sortedNotifications.map(async (notification) => {
        const resourceId = notification.resourceId;
        const resourceType = notification?.resourceType;
        if (resourceType === "photographerUpload") {
          const resource = await UsersModel.query("id").eq(resourceId).exec();
          if (resource.count) {
            return {
              ...notification,
              resource: resource[0],
            };
          }
        } else if (resourceType === "surfBreakUpload") {
          const surfBreakPK = resourceId.split("-")[0];
          const surfBreakSK = resourceId.split("-")[1];
          const resource = await SurfBreaksModel.query("PK").eq(surfBreakPK).where("SK").eq(surfBreakSK).exec();
          if (resource.count) {
            return {
              ...notification,
              resource: resource[0],
            };
          }
        }
        return notification;
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved notifications`,
        results: {
          notifications: resourcePopulatedNotifications,
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

export const sendNotificationToFollowersOnUpload = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:3000",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: "",
      };
    }

    const { userId } = event.pathParameters || {};
    if (!userId) {
      throw new Error("userId is required");
    }

    const body: { surfBreakIdentifier: string; } = JSON.parse(event.body || "{}");
    console.log("Received request to post notification to user followers on completed upload: ", body);

    console.log("userId: ", userId);
    const user = await UsersModel.query("id").eq(userId).exec();
    if (!user.count) {
      throw new Error("User not found");
    }

    const surfBreakPK = body.surfBreakIdentifier.split("-")[0];
    const surfBreakSK = body.surfBreakIdentifier.split("-")[1];
    console.log("surfBreakPK: ", surfBreakPK);
    console.log("surfBreakSK: ", surfBreakSK);
    const surfBreak = await SurfBreaksModel.query("PK").eq(surfBreakPK).where("SK").eq(surfBreakSK).exec();

    for (let i = 0; i < user[0].followers.length; i++) {
      const followerId = user[0].followers[i];
      await NotificationsModel.create({
        id: uuidv4(),
        userId: followerId,
        resourceId: userId,
        resourceType: "photographerUpload",
        body: `Uploaded new media at ${surfBreak[0].name}`,
        read: false,
      });
    }

    if (!surfBreak.count) {
      throw new Error("Surf break not found to notify followers");
    }

    for (let i = 0; i < surfBreak[0].favoritedBy.length; i++) {
      const favoritedById = surfBreak[0].favoritedBy[i];
      await NotificationsModel.create({
        id: uuidv4(),
        userId: favoritedById,
        resourceId: body.surfBreakIdentifier,
        resourceType: "surfBreakUpload",
        body: `New media uploaded by ${user[0].name}`,
        read: false,
      });
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully sent notifications to user followers and surf break favoriters`,
        results: {
          success: true,
        }
      }),
    };
  } catch (error) {
    console.error("Error sending notifications: ", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error sending notifications",
        error: error,
      }),
    };
  }
};