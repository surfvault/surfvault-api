import { ConversationsModel, MessagesModel, UsersModel } from "@/database/dynamoose_models";
import { PusherClient } from "@/shared/pusher_client";
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
    console.log("mergedConversations: ", mergedConversations);

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

export const getConversationWithMessages = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { conversationId } = event.pathParameters || {};
    if (!conversationId) {
      throw new Error("conversationId is required");
    }

    const databaseConversation = await ConversationsModel.query("id").eq(conversationId).exec();
    console.log("databaseConversation: ", databaseConversation);
    if (!databaseConversation.count) {
      throw new Error("Conversation not found");
    }

    const photographerData = await UsersModel.query("id").eq(databaseConversation[0].photographerId).exec();
    const userData = await UsersModel.query("id").eq(databaseConversation[0].userId).exec();
    const messages = await MessagesModel.query("conversationId").eq(conversationId).exec();

    const sortedMessages = messages.sort((a, b) => a.updatedAt - b.updatedAt);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved conversation`,
        results: {
          conversation: {
            ...databaseConversation[0],
            photographerData: photographerData?.[0],
            userData: userData?.[0],
            messages: sortedMessages,
          },
        }
      }),
    };
  } catch (error) {
    console.error("Error getting conversation: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error getting conversation",
        error: error,
      }),
    };
  }
};

export const replyToConversation = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { conversationId, userId } = event.pathParameters || {};
    if (!conversationId) {
      throw new Error("conversationId is required");
    }
    if (!userId) {
      throw new Error("userId is required");
    }

    const databaseConversation = await ConversationsModel.query("id").eq(conversationId).exec();
    console.log("databaseConversation: ", databaseConversation);
    if (!databaseConversation.count) {
      throw new Error("Conversation not found");
    }

    const { message } = JSON.parse(event.body || "{}");

    await MessagesModel.create({
      id: uuidv4(),
      conversationId: conversationId,
      sender: userId,
      body: message,
    });

    await ConversationsModel.update({
      id: conversationId,
      userId: databaseConversation[0].userId,
    }, {
      lastMessage: message,
      userUnreadCount: userId === databaseConversation[0].userId ? 0 : databaseConversation[0].userUnreadCount + 1,
      photographerUnreadCount: userId === databaseConversation[0].photographerId ? 0 : databaseConversation[0].photographerUnreadCount + 1,
    });

    const pusherClient = new PusherClient();
    await pusherClient.sendUserMessageNotification(
      userId === databaseConversation[0].userId ? databaseConversation[0].photographerId : databaseConversation[0].userId,
      message,
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully replied to conversation`,
        results: {
          success: true,
        }
      }),
    };
  } catch (error) {
    console.error("Error replying to conversation: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error replying to conversation",
        error: error,
      }),
    };
  }
};

export const readConversation = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { conversationId, userId } = event.pathParameters || {};
    if (!conversationId) {
      throw new Error("conversationId is required");
    }
    if (!userId) {
      throw new Error("userId is required");
    }

    const databaseConversation = await ConversationsModel.query("id").eq(conversationId).exec();
    console.log("databaseConversation: ", databaseConversation);
    if (!databaseConversation.count) {
      throw new Error("Conversation not found");
    }

    await ConversationsModel.update({
      id: conversationId,
      userId: databaseConversation[0].userId,
    }, {
      userUnreadCount: userId === databaseConversation[0].userId ? 0 : databaseConversation[0].userUnreadCount,
      photographerUnreadCount: userId === databaseConversation[0].photographerId ? 0 : databaseConversation[0].photographerUnreadCount,
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully read new messages in conversation`,
        results: {
          success: true,
        }
      }),
    };
  } catch (error) {
    console.error("Error reading new messages in conversation: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error reading new messages in conversation",
        error: error,
      }),
    };
  }
};