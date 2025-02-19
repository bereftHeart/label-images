import {
  DynamoDB,
  ReturnValue,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import {
  GetObjectCommand,
  S3
} from "@aws-sdk/client-s3";
import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../utils/response";

const dynamodb = new DynamoDB({});
const s3 = new S3({});
const TABLE_NAME = process.env.TABLE_NAME || "ImageTable";
const BUCKET_NAME = process.env.BUCKET_NAME || "ImageBucket";

/*
 * Get paginated images from DynamoDB
 */
export const getImages = async (event: APIGatewayProxyEvent) => {
  const queryParams = event.queryStringParameters || {};
  const limit = Number(queryParams.limit) || 10;
  const lastEvaluatedKey = queryParams.lastKey
    ? JSON.parse(decodeURIComponent(queryParams.lastKey))
    : undefined;

  const command = new ScanCommand({
    TableName: TABLE_NAME,
    Limit: limit,
    ExclusiveStartKey: lastEvaluatedKey,
  });

  try {
    const data = await dynamodb.send(command);
    if (!data.Items) return response(404, "No images found");

    const now = new Date().toISOString();

    const images = await Promise.all(
      data.Items.map(async (item) => {
        let imageUrl = item.url?.S;
        let signedUrlExpiresAt = item.signedUrlExpiresAt?.S;

        if (!item.isExternal?.BOOL) {
          // If signed URL is missing or expired, generate a new one
          if (!imageUrl || !signedUrlExpiresAt || signedUrlExpiresAt < now) {
            imageUrl = await getSignedUrl(
              s3,
              new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: item.s3Key?.S,
              }),
              { expiresIn: 3600 }
            );

            // Update DynamoDB with new signed URL and expiration
            await dynamodb.send(
              new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { id: item.id?.S },
                UpdateExpression:
                  "SET #url = :url, signedUrlExpiresAt = :expiresAt, updatedAt = :updatedAt",
                ExpressionAttributeNames: { "#url": "url" },
                ExpressionAttributeValues: {
                  ":url": imageUrl,
                  ":expiresAt": new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiration
                  ":updatedAt": new Date().toISOString(),
                },
              })
            );
          }
        }

        return {
          id: item.id?.S,
          url: imageUrl,
          label: item.label?.S ?? "",
          createdAt: item.createdAt?.S,
          fileName: item.fileName?.S,
        };
      })
    );

    return response(200, {
      images,
      lastKey: data.LastEvaluatedKey
        ? encodeURIComponent(JSON.stringify(data.LastEvaluatedKey))
        : null,
    });
  } catch (error: any) {
    console.error("Error", error);
    return response(500, error?.message || "Fail to get images");
  }
};

/*
 * Upload an image to the S3 bucket and store metadata in DynamoDB
 */
export const uploadImage = async (event: APIGatewayProxyEvent) => {
  if (!event.body) return response(400, "Missing image data");

  try {
    const { fileName, contentType, base64Image } = JSON.parse(event.body);
    const userId = event.requestContext?.authorizer?.claims.sub;
    const imageId = uuidv4();
    const s3Key = `${userId}/${imageId}/${fileName}`;

    let imageData = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    // Upload image to S3
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: Buffer.from(imageData, "base64"),
      ContentType: contentType,
    });

    // Store metadata in DynamoDB
    await dynamodb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          id: imageId,
          userId: userId,
          s3Key: s3Key,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fileName: fileName,
          isExternal: false,
        },
      })
    );

    return response(200, { id: imageId, fileName });
  } catch (error: any) {
    console.error(error);
    return response(500, error?.message || "Fail to upload image");
  }
};

/*
 * Store external image metadata without downloading
 */
export const storeExternalImage = async (event: APIGatewayProxyEvent) => {
  if (!event.body) return response(400, "Missing data");

  try {
    const { imageUrl } = JSON.parse(event.body);
    if (!imageUrl) return response(400, "Invalid image URL");

    const userId = event.requestContext?.authorizer?.claims.sub;
    const imageId = uuidv4();
    const fileName = imageUrl.split("/").pop()?.split("?")[0] || `image-${imageId}.jpg`;

    // Store metadata in DynamoDB
    await dynamodb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          id: imageId,
          userId: userId,
          url: imageUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fileName: fileName,
          isExternal: true,
        },
      })
    );

    return response(200, { id: imageId, fileName });
  } catch (error: any) {
    console.error(error);
    return response(500, error?.message || "Fail to store external image");
  }
};

/*
 * Update image metadata (label)
 */
export const labelImage = async (event: APIGatewayProxyEvent) => {
  if (!event.body) return response(400, "Missing image data");

  try {
    const { id, label } = JSON.parse(event.body);
    const params = {
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: "SET label = :label, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":label": label,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW" as ReturnValue,
    };

    const result = await dynamodb.send(new UpdateCommand(params));
    const updatedItem = result.Attributes;

    if (!updatedItem) return response(404, "Image not found");

    return response(200, updatedItem);
  } catch (error: any) {
    console.error(error);
    return response(500, error?.message || "Fail to save labels");
  }
};

/*
 * Delete nultiple images from S3 and DynamoDB
  */
export const deleteImages = async (event: APIGatewayProxyEvent) => {
  if (!event.body) return response(400, "Missing request body");

  try {
    const { ids } = JSON.parse(event.body);
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return response(400, "Please provide a valid list of image IDs");
    }
    const deletePromises = ids.map(async (id: string) => {
      const { Item } = await dynamodb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { id },
        })
      );

      if (!Item) return;

      const s3Key = Item.s3Key?.S;
      if (s3Key) {
        await s3.deleteObject({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        });
      }

      await dynamodb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { id },
        })
      );
    });

    await Promise.all(deletePromises);

    return response(200, "Images deleted successfully");
  } catch (error: any) {
    console.error(error);
    return response(500, error?.message || "Fail to delete images");
  }
}