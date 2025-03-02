import { UsersModel } from "@/database/dynamoose_models";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';

export const login = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Logging in...");
    const payload = JSON.parse(event.body || "{}");
    const { user, request } = payload;
    const { email, name, picture, user_id: auth0Id } = user;
    const { cityName, countryCode, subdivisionCode, latitude, longitude } = request.geoip;
    console.log("Authenticating user: ", email, 'from', cityName, subdivisionCode, countryCode);

    const databaseUser = await UsersModel.query('email').eq(email).exec();
    console.log("databaseUser: ", databaseUser);
    if (!databaseUser?.count) {
      console.log("User not found, creating new user...");
      const result = await UsersModel.create({
        id: uuidv4(),
        email,
        name,
        auth0Id,
        picture,
        handle: email.split('@')[0].replace('.', '-'),
        coordinates: {
          latitude,
          longitude,
        }
      });
      console.log("result: ", result);
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ id: result.id }),
      };
    }

    const result = await UsersModel.update({ id: databaseUser[0].id, email }, { name, picture, coordinates: { latitude, longitude } });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ id: result.id }),
    };
  } catch (error) {
    console.error("Error logging in: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error logging in",
        error: error,
      }),
    };
  }
};
