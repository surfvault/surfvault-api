import { CountriesModel } from "@/database/dynamoose_models";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

export const getCountries = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Getting countries...");
    const countries = await CountriesModel.scan().exec();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved countries.`,
        results: {
          countries
        }
      }),
    };
  } catch (error) {
    console.error("Error getting countries: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error getting countries",
        error: error,
      }),
    };
  }
};

export const syncCountries = async () => {
  try {
    console.log("Syncing countries...");
    const { countries } = require('../../countries.json');
    for (const country of countries) {
      await CountriesModel.create(country);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully synced countries.`,
        results: {
          success: true,
        }
      }),
    };
  } catch (error) {
    console.error("Error syncing countries: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error syncing countries",
        error: error,
      }),
    };
  }
};
