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

      const s3ReturnObject = await S3Service.listBucketObjectsWithPrefix(S3Service.SURF_BUCKET, s3Key);

      if (!s3ReturnObject?.Contents?.length) {
        console.log("No s3 objects found for key:", s3Key);
        SurfPhotosModel.delete({ PK: `USER#${databaseUsers[0].id}`, SK: surfPhoto.SK });
        continue;
      }

      photographerSurfPhotosMap[surfBreakName].push(
        `https://${S3Service.SURF_BUCKET}.s3.amazonaws.com/${s3Key}`
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

export const updateUserMetaData = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      throw new Error("User id is required");
    }

    const payload: { currentLocation?: string; name?: string; bio?: string; instragram?: string; website?: string; youtube?: string; picture?: string; } = JSON.parse(event.body || "{}");
    console.log("Received request to update the following meta data for user id: ", id, payload);

    const databaseUser = await UsersModel.query("id").eq(id).exec();
    console.log("databaseUser: ", databaseUser);
    if (!databaseUser.count) {
      throw new Error("User not found");
    }

    let profilePicPresignedUrl = '';
    if (payload?.picture) {
      const s3Key = `${databaseUser[0].handle}.jpg`;
      payload.picture = `https://${S3Service.PROFILE_PIC_BUCKET}.s3.amazonaws.com/${s3Key}`;
      profilePicPresignedUrl = await S3Service.createUploadPresignedUrl(S3Service.PROFILE_PIC_BUCKET, s3Key, 3600);
    }
    await UsersModel.update({ id, email: databaseUser[0]?.email }, payload);

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