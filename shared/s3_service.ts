import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


// const log = logFactory.getLogger("lambda.S3Service");

export class S3Service {
  private static _s3: S3Client | null = null;
  public static readonly SURF_BUCKET = `${process.env.STAGE}-surf`;

  public static _getS3(): S3Client {
    if (S3Service._s3) {
      return S3Service._s3;
    }

    const options: S3ClientConfig = {
      region: 'us-east-1',
    };

    // if (Utils.isOffline()) {
    //   console.log("Using LocalStack for S3");
    //   //If it's offline then use localstack
    //   options.endpoint = process.env.LOCALSTACK_HOST;
    //   options.forcePathStyle = true;
    // }

    return (S3Service._s3 = new S3Client(options));
  }

  public static clearS3(): void {
    S3Service._s3 = null;
  }

  public static createDownloadPresignedUrl(
    bucket: string,
    key: string,
    expiresIn = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(S3Service._getS3(), command, { expiresIn: expiresIn });
  }

  public static createUploadPresignedUrl(
    bucket: string,
    key: string,
    expiresIn = 7200
  ): Promise<string> {
    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(S3Service._getS3(), command, { expiresIn: expiresIn });
  }

  public static async deleteS3Object(bucket: string, key: string) {
    try {
      const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
      const result = await S3Service._getS3().send(command);
      return result;
    } catch (err) {
      console.log(err);
    }
  }

  public static async listBucketObjects(bucket: string) {
    try {
      const command = new ListObjectsV2Command({ Bucket: bucket });
      const result = await S3Service._getS3().send(command);
      return result;
    } catch (err) {
      console.log(err);
    }
  }

  public static async listBucketObjectsWithPrefix(bucket: string, prefix: string, continuationToken?: string) {
    try {
      const command = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken });
      const result = await S3Service._getS3().send(command);
      return result;
    } catch (err) {
      console.log(err);
    }
  }

  public static async listBucketDirectoriesWithPrefix(bucket: string, prefix: string) {
    try {
      const command = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: "/" });
      const result = await S3Service._getS3().send(command);
      return result;
    } catch (err) {
      console.log(err);
    }
  }

  public static async copyS3Object(
    sourceBucket: string,
    sourceKey: string,
    destinationBucket: string,
    destinationKey: string
  ) {
    try {
      const command = new CopyObjectCommand({
        Bucket: destinationBucket,
        CopySource: `${sourceBucket}/${sourceKey}`,
        Key: destinationKey,
      });
      const result = await S3Service._getS3().send(command);
      return result;
    } catch (err) {
      console.log(err);
    }
  }
}
