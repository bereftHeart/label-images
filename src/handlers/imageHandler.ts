import { DynamoDB, ReturnValue, ScanCommand } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../utils/response";

const dynamodb = new DynamoDB({});
const s3 = new S3({});
const TABLE_NAME = process.env.TABLE_NAME || "ImageTable";
const BUCKET_NAME = process.env.BUCKET_NAME || "ImageBucket";

/*
 * Get all images from the DynamoDB table
 */
export const getImages = async () => {
  const command = new ScanCommand({
    TableName: TABLE_NAME,
  });

  try {
    const data = await dynamodb.send(command);
    if (!data.Items) {
      return response(404, "No images found");
    }

    const images = await Promise.all(
      data.Items.map(async (item) => {
        const url = getSignedUrl(
          s3,
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: item.s3key.S,
          }),
          { expiresIn: 3600 }
        );

        return {
          id: item.id.S,
          url,
          label: item.label.SS || [],
          createdAt: item.createdAt.S,
          fileName: item.fileName.S,
        };
      })
    );

    if (!images?.length) {
      return response(404, "No images found");
    }

    return response(200, images);
  } catch (err) {
    console.error("Error", err);
    return response(500, "Fail to get images");
  }
};

/*
 * Upload an image to the S3 bucket and store the metadata in the DynamoDB table
 */
export const uploadImage = async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return response(400, "Missing image data");
  }

  try {
    const { fileName, contentType, base64Image } = JSON.parse(event.body);
    const userId = event.requestContext?.authorizer?.claims.sub;
    const imageId = uuidv4();
    const s3Key = `${userId}/${imageId}/${fileName}`;

    // Remove the data:image prefix if present
    let imageData = base64Image;
    if (base64Image.includes(",")) {
      imageData = base64Image.split(",")[1];
    }

    // Upload image to S3
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: Buffer.from(imageData, "base64"),
      ContentType: contentType,
    });

    // Store image metadata in DynamoDB
    const params = {
      TableName: TABLE_NAME,
      Item: {
        id: { S: imageId },
        userId: { S: userId },
        s3key: { S: s3Key },
        createdAt: { S: new Date().toISOString() },
        fileName: { S: fileName },
      },
    };

    await dynamodb.putItem(params);

    // Generate a pre-signed URL for the uploaded image
    const url = getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      }),
      { expiresIn: 3600 }
    );

    return response(200, { id: imageId, url, fileName });
  } catch (error: any) {
    console.error(error);
    return response(500, "Fail to upload image");
  }
};

/*
 * Label an image in the DynamoDB table
 */
export const labelImage = async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return response(400, "Missing image data");
  }

  try {
    const { id, labels } = JSON.parse(event.body);
    const params = {
      TableName: TABLE_NAME,
      Key: {
        id: { S: id },
      },
      UpdateExpression: "SET labels = :labels, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":labels": { SS: labels },
        ":updatedAt": { S: new Date().toISOString() },
      },
      ReturnValues: "ALL_NEW" as ReturnValue,
    };

    const result = await dynamodb.updateItem(params);
    const updatedItem = result.Attributes;

    if (!updatedItem) {
      return response(404, "Image not found");
    }

    return response(200, updatedItem);
  } catch (error: any) {
    console.error(error);
    return response(500, "Fail to save labels");
  }
};

/*
 * Fetch external image
 */
export const fetchImage = async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return response(400, "Missing data");
  }

  try {
    const { imageUrl } = JSON.parse(event.body);

    // Fetch image from URL
    const fetchResponse = await fetch(imageUrl);

    if (!imageUrl || !fetchResponse.ok) {
      return response(400, "Invalid image URL");
    }

    const userId = event.requestContext?.authorizer?.claims.sub;
    const imageId = uuidv4();

    // Extract filename from URL or generate one
    const urlParts = imageUrl.split("/");
    const fileName =
      urlParts[urlParts.length - 1].split("?")[0] || `image-${imageId}.jpg`;
    const s3Key = `${userId}/${imageId}/${fileName}`;

    const contentType =
      fetchResponse.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await fetchResponse.arrayBuffer();

    // Upload image to S3
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: Buffer.from(imageBuffer),
      ContentType: contentType,
    });

    // Store image metadata in DynamoDB
    const params = {
      TableName: TABLE_NAME,
      Item: {
        id: { S: imageId },
        userId: { S: userId },
        s3key: { S: s3Key },
        createdAt: { S: new Date().toISOString() },
        fileName: { S: fileName },
      },
    };
    await dynamodb.putItem(params);

    // Generate a pre-signed URL for the uploaded image
    const url = getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      }),
      { expiresIn: 3600 }
    );

    return response(200, { id: imageId, url, fileName });
  } catch (error: any) {
    console.error(error);
    return response(500, "Fail to fetch image");
  }
};
