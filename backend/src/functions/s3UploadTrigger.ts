import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { S3Event } from "aws-lambda";

const s3Client = new S3Client({});
const dynamodb = DynamoDBDocumentClient.from(new DynamoDB({}));
const TABLE_NAME = process.env.TABLE_NAME || "ImageTable";

/*
 * s3 upload trigger function
 */
export const lambdaHandler = async (event: S3Event) => {
  try {
    // Step 1: Fetch metadata for all objects in parallel
    const metadataPromises = event.Records.map(async (record) => {
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
      const headObjectResponse = await s3Client.send(
        new HeadObjectCommand({
          Bucket: record.s3.bucket.name,
          Key: key,
        }),
      );

      const s3Metadata = headObjectResponse.Metadata || {};
      const [userId, imageId, fileName] = key.split("/");

      return {
        id: imageId,
        fileName: fileName,
        userId: userId,
        s3Key: key,
        createdAt: new Date().toISOString(),
        createdBy: s3Metadata.username || "Unknown",
        isExternal: false,
        label: s3Metadata.label || "",
      };
    });

    // Wait for all metadata fetches to complete
    const items = await Promise.all(metadataPromises);

    // Step 2: Batch write items to DynamoDB
    const batchSize = 25; // DynamoDB BatchWrite limit is 25 items per request
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const batchWriteParams = {
        RequestItems: {
          [TABLE_NAME]: batch.map((item) => ({
            PutRequest: {
              Item: item,
            },
          })),
        },
      };

      await dynamodb.send(new BatchWriteCommand(batchWriteParams));
    }
  } catch (error: any) {
    console.error("S3 Upload Trigger Error:", error);
    throw error;
  }
};
