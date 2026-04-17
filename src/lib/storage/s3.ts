import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
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
