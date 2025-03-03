import { SurfBreakMediaUploadProgressModel, SurfBreaksModel, SurfPhotosModel, UsersModel } from "@/database/dynamoose_models";
import { S3Service } from "@/shared/s3_service";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

// ----------------------------- SURF MEDIA --------------------------------------

export const getSurfMedia = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { country, region, surf_break, photographer, date } = event.queryStringParameters || {};
    console.log("Received request to get surf media: ", { country, surf_break, photographer, date });
    if (!country) {
      throw new Error("Invalid country identifier");
    }

    if (!surf_break && !photographer) {
      throw new Error("Missing surf break or photographer");
    }

    if (surf_break && photographer) {
      // get media for specific surf break and photographer
      const s3Key = region !== "0" ? `${country}/${region}/${surf_break}/${date}/${photographer}` : `${country}/${surf_break}/${date}/${photographer}`;
      const s3ReturnObject = await S3Service.listBucketObjectsWithPrefix(S3Service.SURF_BUCKET, s3Key);
      const surfBreakByPhotographerMap: { [key: string]: string[]; } = {
        [photographer]: [],
      };
      for (const content of s3ReturnObject?.Contents ?? []) {
        surfBreakByPhotographerMap[photographer].push(
          `https://${S3Service.SURF_BUCKET}.s3.amazonaws.com/${content.Key}`
        );
      }
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: `Successfully retrieved surf media for country: ${country} and surf break: ${surf_break} and photographer: ${photographer}`,
          results: {
            media: surfBreakByPhotographerMap,
            total: 1,
          }
        }),
      };
    } else if (surf_break) {
      // get media for specific surf break
      const s3Key = region != "0" ? `${country}/${region}/${surf_break}/${date}` : `${country}/${surf_break}/${date}`;
      const s3ReturnObject = await S3Service.listBucketObjectsWithPrefix(S3Service.SURF_BUCKET, s3Key);
      console.log("s3ReturnObject", s3ReturnObject);

      const surfBreakByPhotographerMap: { [key: string]: string[]; } = {};
      for (const content of s3ReturnObject?.Contents ?? []) {
        const splitKey = content.Key.split("/");
        const photographerHandle = region != "0" ? splitKey[4] : splitKey[3];

        // Initialize the array if it doesn't exist
        if (!surfBreakByPhotographerMap[photographerHandle]) {
          surfBreakByPhotographerMap[photographerHandle] = [];
        }

        // Push the current URL into the photographer's array
        surfBreakByPhotographerMap[photographerHandle].push(
          `https://${S3Service.SURF_BUCKET}.s3.amazonaws.com/${content.Key}`
        );
      }
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: `Successfully retrieved surf media for country: ${country} and surf break: ${surf_break}`,
          results: {
            media: surfBreakByPhotographerMap,
            total: s3ReturnObject.KeyCount,
          }
        }),
      };
    }
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

export const saveSurfMedia = async (
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

    const body: { media_type: string; media_name: string; country_identifier: string; region: string; surf_break: string; photographer: string; date: string; } = JSON.parse(event.body || "{}");
    console.log("Received request to save surf media: ", body);

    if (!body?.country_identifier) {
      throw new Error("Invalid country identifier");
    }

    const users = await UsersModel.query("handle").eq(body.photographer).exec();
    if (!users.count) {
      throw new Error("Photographer not found");
    }

    // date as YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];
    // const uuid = Math.random().toString(36).substring(2, 8); // start at index 2 to skip decimal point

    const keyParts = [
      body.country_identifier,
      body.surf_break,
      body?.date ?? today,
      body.photographer,
      `${body.media_name}.${body.media_type.split("/")[1]}`, // TODO: may need to replace this with uuid incase of duplicate names
    ];
    if (body?.region) {
      // insert region after country
      keyParts.splice(1, 0, body.region);
    }
    const s3Key = keyParts.join("/");

    const putUrl = await S3Service.createUploadPresignedUrl(
      S3Service.SURF_BUCKET,
      s3Key
    );
    if (!putUrl) {
      throw new Error("Error creating presigned url.");
    }

    await SurfPhotosModel.create({
      PK: `USER#${users[0].id}`,
      SK: `PHOTO#${s3Key.replace(/\//g, "#")}`,
      s3Key,
    });

    const mediaUrl = `https://${S3Service.SURF_BUCKET}.s3.amazonaws.com/${s3Key}`;
    console.log("mediaUrl", mediaUrl);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully saved surf media for country: ${body.country_identifier}`,
        results: {
          mediaUrl,
          putUrl,
        }
      }),
    };
  } catch (error) {
    console.error("Error saving surf media: ", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error saving surf media",
        error: error,
      }),
    };
  }
};

export const deleteSurfMedia = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { country, region, surf_break, date, photographer, photo, type } = event.pathParameters || {};
    console.log("Received request to delete surf media: ", { country, surf_break, photographer, date, photo, type });
    if (!country) {
      throw new Error("Invalid country identifier");
    }

    if (!surf_break && !photographer) {
      throw new Error("Missing surf break or photographer");
    }

    if (!date) {
      throw new Error("Missing date");
    }

    if (!photo) {
      throw new Error("Missing photo name");
    }

    const users = await UsersModel.query("handle").eq(photographer).exec();
    if (!users.count) {
      throw new Error("Photographer not found");
    }

    const s3KeyToDelete = region && region !== "0" ? `${country}/${region}/${surf_break}/${date}/${photographer}/${photo}.${type}` : `${country}/${surf_break}/${date}/${photographer}/${photo}.${type}`;
    await S3Service.deleteS3Object(S3Service.SURF_BUCKET, s3KeyToDelete);
    await SurfPhotosModel.delete({ PK: `USER#${users[0].id}`, SK: `PHOTO#${s3KeyToDelete.replace(/\//g, "#")}` });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully deleted surf media for photographer: ${photographer}`,
        results: {
          success: true,
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

// ------------------------------ SURF BREAKS ------------------------------------

export const doesSurfBreakExist = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Received request to check if surf break exists: ", event.pathParameters);
    const { country, region, surf_break } = event.pathParameters || {};
    if (!country) {
      throw new Error("Invalid country identifier");
    }

    if (!surf_break) {
      throw new Error("Missing surf break");
    }

    const surfBreakInDB = await SurfBreaksModel.query("PK").eq(`SURFBREAK#${country}`).where("SK").eq(`${region ?? "_"}#${surf_break}`).exec();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully queried country: ${country}, region: ${region} and surf break: ${surf_break}`,
        results: {
          surfBreak: surfBreakInDB,
          exists: surfBreakInDB.length > 0,
        }
      }),
    };
  } catch (error) {
    console.error("Error querying for surf break: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error querying for surf break",
        error: error,
      }),
    };
  }
};

export const createSurfBreak = async (
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

    const body: { country_identifier: string; surf_break: string; photographer: string; coordinates: number[]; region?: string; } = JSON.parse(event.body || "{}");
    console.log("Received request to create surf break: ", body);

    if (!body?.country_identifier) {
      throw new Error("Invalid country identifier");
    }

    if (!body?.surf_break) {
      throw new Error("Invalid surf break");
    }

    const user = await UsersModel.query("handle").eq(body.photographer).exec();
    if (!user.count) {
      throw new Error("Photographer not found");
    }

    await SurfBreaksModel.create({
      PK: `SURFBREAK#${body.country_identifier}`,
      SK: `${body?.region ?? "_"}#${body.surf_break}`,
      name: body.surf_break,
      country: body.country_identifier,
      coordinates: {
        lat: body.coordinates[0],
        lon: body.coordinates[1],
      },
      createdBy: `USER#${user[0].id}`,
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully created surf break ${body.surf_break} for country: ${body.country_identifier} and region: ${body.region}`,
        results: {
          success: true,
        }
      }),
    };
  } catch (error) {
    console.error("Error saving surf media: ", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error saving surf media",
        error: error,
      }),
    };
  }
};

export const getSurfBreaks = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {

    // get all surf breaks and append the latest surf photo to each surf break
    const surfBreaks = await SurfBreaksModel.scan().exec();
    for (const surfBreak of surfBreaks) {
      const s3Prefix = surfBreak.SK.split("#")[0] !== "_" ? `${surfBreak.country}/${surfBreak.SK.split("#")[0]}/${surfBreak.name}` : `${surfBreak.country}/${surfBreak.name}`;
      const randomPhotoFromS3 = await S3Service.listBucketObjectsWithPrefix(S3Service.SURF_BUCKET, s3Prefix);
      surfBreak.thumbnail = randomPhotoFromS3?.Contents?.length ? `https://${S3Service.SURF_BUCKET}.s3.amazonaws.com/${randomPhotoFromS3.Contents[0].Key}` : "";
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved surf breaks`,
        results: {
          breaks: surfBreaks,
          total: surfBreaks.length,
        }
      }),
    };
  } catch (error) {
    console.error("Error getting surf breaks: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error getting surf breaks",
        error: error,
      }),
    };
  }
};

export const getSurfBreakMediaUploadProgress = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    const { photographer } = event.queryStringParameters || {};
    console.log("Received request to get upload progress: ", photographer);

    if (!photographer) {
      throw new Error("Missing photographer");
    }

    const users = await UsersModel.query("handle").eq(photographer).exec();
    if (!users.count) {
      throw new Error("Photographer not found");
    }

    const photographerUploads = await SurfBreakMediaUploadProgressModel.query("PK").eq(`USER#${users[0].id}`).exec();
    const pendingUploads = photographerUploads.filter(upload => (upload.success + upload.error) < upload.total);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved uploads for photographer: ${photographer}`,
        results: {
          uploads: pendingUploads,
        }
      }),
    };

  } catch (error) {
    console.error("Error getting surf uploads: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error getting surf uploads",
        error: error,
      }),
    };
  }
};
