import { ConversationsModel, MessagesModel, UsersModel } from "@/database/dynamoose_models";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';

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

    const [byUser, byPhotographer] = await Promise.all([
      ConversationsModel.query("userId").eq(userId).exec(),
      ConversationsModel.query("photographerId").eq(userId).exec(),
    ]);

    // merge + dedupe if needed
    const mergedConversations = [...byUser, ...byPhotographer];

    const conversationsPopulated = await Promise.all(
      mergedConversations.map(async (conversation) => {
        const photographers = await UsersModel.query("id").eq(conversation.photographerId).exec();
        const users = await UsersModel.query("id").eq(conversation.userId).exec();

        return {
          ...conversation,
          photographerData: photographers?.[0],
          userData: users?.[0],
        };
      })
    );
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved conversations`,
        results: {
          conversations: conversationsPopulated,
          total: mergedConversations.length,
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

export const startConversationWithPhotographer = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { userId, photographerId } = event.pathParameters || {};
    if (!userId) {
      throw new Error("userId is required");
    }

    if (!photographerId) {
      throw new Error("photographerId is required");
    }

    const [user, photographer] = await Promise.all([
      UsersModel.query("id").eq(userId).exec(),
      UsersModel.query("id").eq(photographerId).exec(),
    ]);

    if (!user.count) {
      throw new Error("User not found");
    }

    if (!photographer.count) {
      throw new Error("Photographer not found");
    }

    const { message } = JSON.parse(event.body || "{}");

    const conversation = await ConversationsModel.create({
      id: uuidv4(),
      userId,
      photographerId,
      lastMessage: message,
    });

    await MessagesModel.create({
      id: uuidv4(),
      conversationId: conversation.id,
      sender: userId,
      body: message,
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully started conversation w/ photographer: ${photographerId}`,
        results: {
          success: true,
        }
      }),
    };
  } catch (error) {
    console.error("Error starting conversation w/ photographer: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error starting conversation w/ photographer",
        error: error,
      }),
    };
  }
};
