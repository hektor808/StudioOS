import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

import { getR2Config } from "@/lib/r2/env";

let cachedClient: S3Client | null = null;

export function getR2Client(): { client: S3Client; bucket: string } {
  const config = getR2Config();

  cachedClient ??= new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client: cachedClient, bucket: config.bucketName };
}
