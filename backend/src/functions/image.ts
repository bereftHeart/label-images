import { APIGatewayProxyEvent } from "aws-lambda";
import {
  storeExternalImage,
  getImages,
  labelImage,
  uploadImage,
  deleteImages,
} from "../handlers/imageHandler";
import { response } from "../utils/response";

export const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  try {
    switch (event.httpMethod) {
      case "GET":
        return await getImages(event);
      case "POST":
        const path = event.resource;

        if (path === "/label-images/upload") {
          return await uploadImage(event);
        }

        if (path === "/label-images/external") {
          return await storeExternalImage(event);
        }

        if (path === "/label-images/bulk-delete") {
          return await deleteImages(event);
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
