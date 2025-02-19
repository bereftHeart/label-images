import { APIGatewayProxyEvent } from "aws-lambda";
import { response } from "../utils/response";
import {
  fetchImage,
  getImages,
  labelImage,
  uploadImage,
} from "../handlers/imageHandler";

export const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  try {
    switch (event.httpMethod) {
      case "GET":
        return await getImages();
      case "POST":
        const path = event.resource;

        if (path === "/label-images/upload") {
          return await uploadImage(event);
        }

        if (path === "/label-images/fetch-external") {
          return await fetchImage(event);
        }

        return response(400, "Bad Request");
      case "PUT":
        return await labelImage(event);
      default:
        return response(405, "Method Not Allowed");
    }
  } catch (error: any) {
    console.error(error);
    return response(500, "Internal Server Error");
  }
};
