import {
  DynamoDB,
  ReturnValue,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import {
  GetObjectCommand,
  S3
} from "@aws-sdk/client-s3";
import { BatchWriteCommand, DeleteCommand, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../utils/response";

const dynamodb = new DynamoDB({});
const s3 = new S3({});
const TABLE_NAME = process.env.TABLE_NAME || "ImageTable";
const BUCKET_NAME = process.env.BUCKET_NAME || "ImageBucket";

interface inputImageData {
  fileName: string;
  label?: string;
  contentType: string;
  base64Image: string;
}

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
                  "SET #url = :url, signedUrlExpiresAt = :expiresAt",
                ExpressionAttributeNames: { "#url": "url" },
                ExpressionAttributeValues: {
                  ":url": imageUrl,
                  ":expiresAt": new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiration
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
          updatedAt: item.updatedAt?.S,
          createdBy: item.createdBy?.S,
          updatedBy: item.updatedBy?.S,
          fileName: item.fileName?.S,
        };
      })
    );

    images.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

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
    const { fileName, contentType, base64Image, label } = JSON.parse(event.body) as inputImageData;

    if (!fileName || !contentType || !base64Image) {
      return response(400, "Invalid image data");
    }

    const userId = event.requestContext?.authorizer?.claims.sub;
    const userName = event.requestContext?.authorizer?.claims["cognito:username"];
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
          fileName: fileName,
          userId: userId,
          s3Key: s3Key,
          createdAt: new Date().toISOString(),
          createdBy: userName,
          isExternal: false,
          label: label || "",
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
    const { imageUrl, label } = JSON.parse(event.body);
    if (!imageUrl) return response(400, "Invalid image URL");

    const userId = event.requestContext?.authorizer?.claims.sub;
    const userName = event.requestContext?.authorizer?.claims["cognito:username"];
    const imageId = uuidv4();
    const fileName = imageUrl.split("/").pop()?.split("?")[0] || `image-${imageId}.jpg`;

    // Store metadata in DynamoDB
    await dynamodb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          id: imageId,
          fileName: fileName,
          userId: userId,
          url: imageUrl,
          createdAt: new Date().toISOString(),
          createdBy: userName,
          isExternal: true,
          label: label || "",
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
    const userName = event.requestContext?.authorizer?.claims["cognito:username"];
    const params = {
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: "SET label = :label, updatedAt = :updatedAt, updatedBy = :updatedBy",
      ExpressionAttributeValues: {
        ":label": label,
        ":updatedAt": new Date().toISOString(),
        ":updatedBy": userName,
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

/*
* Bulk upload images
*/
export const uploadImages = async (event: APIGatewayProxyEvent) => {
  try {
    const body = JSON.parse(event.body || "{}");

    if (!Array.isArray(body.images) || body.images.length === 0) {
      return response(400, "Invalid request: No images provided");
    }

    const now = new Date().toISOString();
    const userId = event.requestContext?.authorizer?.claims.sub;
    const userName = event.requestContext?.authorizer?.claims["cognito:username"];

    // Prepare batch write requests for DynamoDB
    const putRequests = body.images.map((image: inputImageData) => {
      const imageId = uuidv4();
      return ({
        PutRequest: {
          Item: {
            id: { S: imageId },
            userId: { S: userId },
            fileName: { S: image.fileName },
            createdAt: { S: now },
            createdBy: { S: userName },
            label: { S: image.label ?? "" },
            s3Key: { S: `${userId}/${imageId}/${image.fileName}` },
            isExternal: { BOOL: false }
          },
        },
      })
    }
    );

    // Write to DynamoDB in batches of 25 (DynamoDB limit)
    for (let i = 0; i < putRequests.length; i += 25) {
      const batch = putRequests.slice(i, i + 25);
      await dynamodb.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch,
          },
        })
      );
    }

    return response(201, { message: "Images uploaded successfully", count: putRequests.length });
  } catch (error: any) {
    console.error("Upload Images Error:", error);
    return response(500, error?.message || "Fail to upload images");
  }
};
