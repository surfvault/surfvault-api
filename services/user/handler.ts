import { SurfPhotosModel, UsersModel } from "@/database/dynamoose_models";
import { S3Service } from "@/shared/s3_service";
import { SQSService } from "@/shared/sqs_service";
import { APIGatewayEvent, APIGatewayProxyResult, SQSEvent } from "aws-lambda";

export const getSelf = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { id } = event.pathParameters || {};
    console.log("Received request to get self for user id: ", id);
    const databaseUser = await UsersModel.query("id").eq(id).exec();
    console.log("databaseUser: ", databaseUser);
    if (!databaseUser.count) {
      throw new Error("User not found");
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved self.`,
        results: {
          user: databaseUser[0]
        }
      }),
    };
  } catch (error) {
    console.error("Error retrieving self: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error retrieving self",
        error: error,
      }),
    };
  }
};

export const getPhotographer = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { handle } = event.pathParameters || {};
    console.log("Received request to get self for user id: ", handle);
    const databaseUsers = await UsersModel.query("handle").eq(handle).exec();
    console.log("databaseUser: ", databaseUsers);
    if (!databaseUsers.count) {
      throw new Error("User not found");
    }

    const { self } = event.queryStringParameters || {};

    const s3Bucket = self === "true" && databaseUsers[0].access === "private" ? S3Service.SURF_BUCKET_PRIVATE : S3Service.SURF_BUCKET;

    const photographerSurfPhotos = await SurfPhotosModel.query("PK").eq(`USER#${databaseUsers[0].id}`).exec();
    const photographerSurfPhotosMap = {};
    for (const surfPhoto of photographerSurfPhotos) {
      const skParts = surfPhoto.SK.split("#");
      const country = skParts[1];
      const region = skParts[2];
      const surfBreakName = skParts[3];
      const photoDate = skParts[4];
      const fileNameAndType = skParts[6];

      const s3KeyParts = [
        country,
        surfBreakName,
        photoDate,
        handle,
        fileNameAndType
      ];

      if (region !== "_") {
        s3KeyParts.splice(1, 0, region);
      }
      const s3Key = s3KeyParts.join("/");

      if (!photographerSurfPhotosMap[surfBreakName]) {
        photographerSurfPhotosMap[surfBreakName] = [];
      }

      if (photographerSurfPhotosMap[surfBreakName].length >= 10) {
        continue;
      }

      const s3ReturnObject = await S3Service.listBucketObjectsWithPrefix(s3Bucket, s3Key);

      if (!s3ReturnObject?.Contents?.length) {
        console.log("No s3 objects found for key:", s3Key);
        // SurfPhotosModel.delete({ PK: `USER#${databaseUsers[0].id}`, SK: surfPhoto.SK });
        continue;
      }

      photographerSurfPhotosMap[surfBreakName].push(
        `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`
      );
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved photographer.`,
        results: {
          photographer: { ...databaseUsers[0], surfBreaksPopulated: photographerSurfPhotosMap }
        }
      }),
    };
  } catch (error) {
    console.error("Error retrieving photographer: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error retrieving photographer",
        error: error,
      }),
    };
  }
};

export const updateUserHandle = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      throw new Error("User id is required");
    }

    const payload = JSON.parse(event.body || "{}");
    const { handle } = payload;
    console.log("Received request to update handle for user id: ", id);

    const userExistWithHandle = await UsersModel.query("handle").eq(handle).exec();
    if (userExistWithHandle.count) {
      throw new Error("Handle already exists");
    }

    const databaseUser = await UsersModel.query("id").eq(id).exec();
    console.log("databaseUser: ", databaseUser);
    if (!databaseUser.count) {
      throw new Error("User not found");
    }

    if (databaseUser[0]?.handleChanged) {
      // charge user for handle change since they've already changed it once, similar to playstation/xbox
      console.log("User has already changed handle once, charging one time freefor handle change");
    }

    await UsersModel.update({ id, email: databaseUser[0]?.email }, { handle, handleChanged: true });

    const userSurfBreakCountryMap = databaseUser[0]?.surfBreaks;
    if (userSurfBreakCountryMap) {
      // Update all s3 objects with new handle
      // sqs will be triggered for each SURF_BUCKET
      const sqsErrors = [];
      for (const country in userSurfBreakCountryMap) {
        const result = await SQSService.sendMessage(
          process.env.UPDATE_S3_PHOTOGRAPHER_HANDLE_SQS_QUEUE_URL,
          JSON.stringify({
            country,
            userId: id,
            oldHandle: databaseUser[0].handle,
            newHandle: handle
          })
        );
        if (!result.MessageId) {
          sqsErrors.push(country);
        }
      }

      if (sqsErrors.length) {
        console.error("Error sending messages to update s3 objects for countries:", sqsErrors);
        throw new Error("Error updating s3 objects for some countries");
      }
    }


    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully updated user handle.`,
        results: {
          success: true
        }
      }),
    };
  } catch (error) {
    console.error("Error updating user handle: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error updating handle",
        error: error,
      }),
    };
  }
};

export const updateUserFavorites = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      throw new Error("User id is required");
    }

    const payload: { surfBreakIdentifier: string; action: "favorite" | "unfavorite"; } = JSON.parse(event.body || "{}");
    console.log("Received request to update favorites for user id: ", id, payload);

    const databaseUser = await UsersModel.query("id").eq(id).exec();
    console.log("databaseUser: ", databaseUser);
    if (!databaseUser.count) {
      throw new Error("User not found");
    }

    if (payload.action === 'favorite') {
      const updatedFavorites = [...(databaseUser[0]?.favorites || []), payload.surfBreakIdentifier];
      await UsersModel.update({ id, email: databaseUser[0]?.email }, { favorites: updatedFavorites });
    } else {
      const updatedFavorites = (databaseUser[0]?.favorites || []).filter((surfBreakId: string) => surfBreakId !== payload.surfBreakIdentifier);
      await UsersModel.update({ id, email: databaseUser[0]?.email }, { favorites: updatedFavorites });
    }


    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully updated user handle.`,
        results: {
          success: true
        }
      }),
    };
  } catch (error) {
    console.error("Error updating user handle: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error updating handle",
        error: error,
      }),
    };
  }
};

export const updateUserMetaData = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      throw new Error("User id is required");
    }

    const payload: { currentLocation?: string; name?: string; bio?: string; instragram?: string; website?: string; youtube?: string; picture?: string; access?: "private" | "public"; } = JSON.parse(event.body || "{}");
    console.log("Received request to update the following meta data for user id: ", id, payload);

    const databaseUser = await UsersModel.query("id").eq(id).exec();
    console.log("databaseUser: ", databaseUser);
    if (!databaseUser.count) {
      throw new Error("User not found");
    }

    let profilePicPresignedUrl = '';
    if (payload?.picture) {
      const picType = payload.picture.split("/")[1];
      const s3Key = `${databaseUser[0].handle}.${picType}`;
      payload.picture = `https://${S3Service.PROFILE_PIC_BUCKET}.s3.amazonaws.com/${s3Key}`;
      profilePicPresignedUrl = await S3Service.createUploadPresignedUrl(S3Service.PROFILE_PIC_BUCKET, s3Key, 3600);
    }

    await UsersModel.update({ id, email: databaseUser[0]?.email }, payload);

    if (payload?.access) {
      await SQSService.sendMessage(
        process.env.UPDATE_S3_PHOTOGRAPHER_ACCESS_SQS_QUEUE_URL,
        JSON.stringify({
          userId: id,
          access: payload.access
        })
      );
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully updated user handle.`,
        results: {
          success: true,
          profilePicPresignedUrl
        }
      }),
    };
  } catch (error) {
    console.error("Error updating user handle: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error updating handle",
        error: error,
      }),
    };
  }
};

export const followPhotographer = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      throw new Error("User id is required");
    }

    const payload: { photographerUserId?: string; action: "follow" | "unfollow"; } = JSON.parse(event.body || "{}");
    console.log("Received request to follow a photographer for user id: ", id, payload);

    const databaseUser = await UsersModel.query("id").eq(id).exec();
    if (!databaseUser.count) {
      throw new Error("User not found");
    }

    const photographerUser = await UsersModel.query("id").eq(payload.photographerUserId).exec();
    if (!photographerUser.count) {
      throw new Error("Photographer not found");
    }

    if (payload.action === 'follow') {
      const updatedFollowing = [...(databaseUser[0]?.following || []), payload.photographerUserId];
      await UsersModel.update({ id, email: databaseUser[0]?.email }, { following: updatedFollowing });
      const updatedFollowers = [...(photographerUser[0]?.followers || []), id];
      await UsersModel.update({ id: payload.photographerUserId, email: photographerUser[0]?.email }, { followers: updatedFollowers });
    } else {
      const updatedFollowing = (databaseUser[0]?.following || []).filter((userId: string) => userId !== payload.photographerUserId);
      await UsersModel.update({ id, email: databaseUser[0]?.email }, { following: updatedFollowing });
      const updatedFollowers = (photographerUser[0]?.followers || []).filter((userId: string) => userId !== id);
      await UsersModel.update({ id: payload.photographerUserId, email: photographerUser[0]?.email }, { followers: updatedFollowers });
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully updated user handle.`,
        results: {
          success: true,
        }
      }),
    };
  } catch (error) {
    console.error("Error updating user handle: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error updating handle",
        error: error,
      }),
    };
  }
};

// TODO monetization opportunity with 1 free handle change then pay to update after?
interface SQSUpdateS3PhotographerHandleMessageBody {
  country: string;
  userId: string;
  oldHandle: string;
  newHandle: string;
  continuationToken?: string;
  countriesUpdated?: string[];
}
export const updateS3PhotographerHandle = async (event: SQSEvent, context: any) => {
  for (const record of event.Records) {
    const sqsBody = record.body;
    console.log("sqsBody:", sqsBody);
    const updateS3PhotographerHandleBody: SQSUpdateS3PhotographerHandleMessageBody =
      JSON.parse(sqsBody);
    const { country, userId, oldHandle, newHandle } = updateS3PhotographerHandleBody;
    let { continuationToken } = updateS3PhotographerHandleBody;

    const databaseUser = await UsersModel.query("id").eq(userId).exec();

    const userSurfBreakCountryMap = databaseUser[0]?.surfBreaks;
    for (const country in userSurfBreakCountryMap) { // TODO we just want surfbreaks pertaining to country
      const surfBreaks = userSurfBreakCountryMap[country];
      for (const surfBreak in surfBreaks) {
        const surfBreakDates = surfBreaks[surfBreak];
        for (const date of surfBreakDates) {
          const oldPrefix = `${country}/${surfBreak}/${date}/${oldHandle}`;
          const s3ReturnObject = await S3Service.listBucketObjectsWithPrefix(S3Service.SURF_BUCKET, oldPrefix, continuationToken);
          for (const content of s3ReturnObject?.Contents ?? []) {
            const newKey = content.Key.replace(oldHandle, newHandle);
            await S3Service.copyS3Object(S3Service.SURF_BUCKET, content.Key, S3Service.SURF_BUCKET, newKey);
            await S3Service.deleteS3Object(S3Service.SURF_BUCKET, content.Key);
          }
          continuationToken = s3ReturnObject?.ContinuationToken;
        }
      }
    }

    if (continuationToken) {
      console.log("Remaining s3 objects for country", country, "sending back to sqs will continuationToken", continuationToken);
      await SQSService.sendMessage(
        process.env.UPDATE_S3_PHOTOGRAPHER_HANDLE_SQS_QUEUE_URL,
        JSON.stringify({
          ...updateS3PhotographerHandleBody,
          continuationToken
        })
      );
    } else {
      console.log("All s3 objects in the following country updated for user", userId, country);
    }
  }
};

interface SQSUpdateS3PhotographerAccessMessageBody {
  userId: string;
  access: "private" | "public";
  continuationToken?: string;
}
export const updateS3PhotographerAccess = async (event: SQSEvent, context: any) => {
  for (const record of event.Records) {
    const sqsBody = record.body;
    console.log("sqsBody:", sqsBody);
    const updateS3PhotographerHandleBody: SQSUpdateS3PhotographerAccessMessageBody =
      JSON.parse(sqsBody);
    const { userId, access } = updateS3PhotographerHandleBody;

    if (access !== "private" && access !== "public") {
      console.error("Invalid access type: ", access);
      throw new Error("Invalid access type");
    }

    const originalBucket = access === "private" ? S3Service.SURF_BUCKET : S3Service.SURF_BUCKET_PRIVATE;
    const targetBucket = access === "private" ? S3Service.SURF_BUCKET_PRIVATE : S3Service.SURF_BUCKET;

    const userPhotos = await SurfPhotosModel.query("PK").eq(`USER#${userId}`).exec();
    for (let i = 0; i < userPhotos.length; i++) {
      const photo = userPhotos[i];
      const s3KeyParts = photo.SK.replace("PHOTO#", "").split("#");
      const s3Key = s3KeyParts.join("/");
      const s3ReturnObject = await S3Service.listBucketObjectsWithPrefix(originalBucket, s3Key);
      const content = s3ReturnObject?.Contents?.[0];

      if (!content || !s3ReturnObject.KeyCount) {
        console.log('photo already migrated, skipping:', photo.SK);
        continue;
      }

      await S3Service.copyS3Object(originalBucket, content.Key, targetBucket, content.Key);
      await S3Service.deleteS3Object(originalBucket, content.Key);
    }

    console.log("All s3 objects migrated for user: ", userId, " to ", access, " bucket");
  }
};