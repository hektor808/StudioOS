import "server-only";

export const R2_CONFIGURATION_ERROR = "R2 storage is not configured.";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  uploadGrantSecret: string;
  endpoint: string;
};

export function getR2Config(
  values: NodeJS.ProcessEnv = process.env,
): R2Config {
  const accountId = values.R2_ACCOUNT_ID?.trim();
  const accessKeyId = values.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = values.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = values.R2_BUCKET_NAME?.trim();
  const uploadGrantSecret = values.UPLOAD_GRANT_SECRET?.trim();

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !uploadGrantSecret ||
    Buffer.byteLength(uploadGrantSecret, "utf8") < 32
  ) {
    throw new Error(R2_CONFIGURATION_ERROR);
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    uploadGrantSecret,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}
