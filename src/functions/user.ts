import { APIGatewayProxyEvent } from "aws-lambda";
import { response } from "../utils/response";
import { createUser, loginUser } from "../handlers/userHandler";

export const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const path = event.resource; // Get the API route

    if (event.httpMethod !== "POST") {
      return response(405, "Method Not Allowed");
    }

    if (path === "/auth/signup") {
      return await createUser(event);
    }

    if (path === "/auth/login") {
      return await loginUser(event);
    }

    return response(400, "Bad Request");
  } catch (error: any) {
    console.error(error);
    return response(500, "Internal Server Error");
  }
};
