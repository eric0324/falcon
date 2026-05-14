import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getConfigRequired } from "@/lib/config";

async function getClientAndBucket(): Promise<{ client: S3Client; bucket: string }> {
  const [bucket, region, accessKeyId, secretAccessKey] = await Promise.all([
    getConfigRequired("AWS_S3_BUCKET"),
    getConfigRequired("AWS_S3_REGION"),
    getConfigRequired("AWS_ACCESS_KEY_ID"),
    getConfigRequired("AWS_SECRET_ACCESS_KEY"),
  ]);

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucket };
}

export async function uploadImage(params: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<void> {
  const { client, bucket } = await getClientAndBucket();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
    })
  );
}

/** Server-side copy within the same bucket. Used when promoting author-owned image keys to tool-asset namespace at deploy time. */
export async function copyImage(params: {
  fromKey: string;
  toKey: string;
  contentType?: string;
}): Promise<void> {
  const { client, bucket } = await getClientAndBucket();

  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      // CopySource must be `bucket/key`, URL-encoded
      CopySource: `${bucket}/${encodeURI(params.fromKey)}`,
      Key: params.toKey,
      ...(params.contentType
        ? {
            ContentType: params.contentType,
            MetadataDirective: "REPLACE" as const,
          }
        : {}),
    })
  );
}

export async function getObjectBuffer(params: {
  key: string;
}): Promise<Buffer> {
  const { client, bucket } = await getClientAndBucket();

  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: params.key })
  );

  const body = response.Body as
    | { transformToByteArray: () => Promise<Uint8Array> }
    | undefined;
  if (!body) {
    throw new Error(`S3 object ${params.key} returned empty body`);
  }

  const bytes = await body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function getPresignedUrl(params: {
  key: string;
  ttlSeconds?: number;
}): Promise<string> {
  const { client, bucket } = await getClientAndBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: params.key,
  });

  return getSignedUrl(client, command, {
    expiresIn: params.ttlSeconds ?? 3600,
  });
}
