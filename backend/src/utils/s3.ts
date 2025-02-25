import { S3 } from "@aws-sdk/client-s3";

export const s3 = new S3({
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: "auto", // Use "auto" for R2
    credentials: {
        accessKeyId: process.env.CF_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CF_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true, // Required for R2
});