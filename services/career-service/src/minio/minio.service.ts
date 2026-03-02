import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Client } from "minio";
import { env } from "../config/validateEnv.config.js";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

@Injectable()
export class MinioService {
  private minioClient: Client;

  constructor(
    @InjectPinoLogger(MinioService.name)
    private readonly logger: PinoLogger,
  ) {
    this.logger.info("Initializing Minio client");
    this.minioClient = new Client({
      endPoint: env.MINIO_ENDPOINT!,
      port: Number(env.MINIO_PORT),
      useSSL: false,
      accessKey: env.MINIO_ACCESS_KEY!,
      secretKey: env.MINIO_SECRET_KEY!,
    });
  }

  // ========================================================================
  // PRIVATE FILE UPLOADS (Used by Career Service for Resumes)
  // ========================================================================
  async uploadPrivateFile(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      await this.minioClient.putObject(
        bucket,
        objectName,
        buffer,
        buffer.length,
        { "Content-Type": mimeType },
      );

      return objectName;
    } catch (error) {
      this.logger.error(
        { error, bucket, objectName },
        "Failed to upload private file to Minio",
      );
      throw new InternalServerErrorException("File upload failed");
    }
  }

  // ========================================================================
  // GENERATE PRESIGNED URL (For Secure, Temporary File Access)
  // ========================================================================
  async generatePresignedGetUrl(
    bucketName: string,
    objectName: string,
  ): Promise<string> {
    try {
      // ✨ Asks the Minio server to cryptographically sign a temporary URL
      const url = await this.minioClient.presignedGetObject(
        bucketName,
        objectName,
        env.VIEW_TIME_LIMIT_MINUTES * 60, // Default: 15 minutes
      );
      return url;
    } catch (error) {
      this.logger.error(
        { error, bucketName, objectName },
        "Failed to generate presigned URL",
      );
      throw new InternalServerErrorException(
        "Failed to generate secure file link",
      );
    }
  }

  // ========================================================================
  // DELETE FILE (Used for Orphan Cleanup & Deletions)
  // ========================================================================
  async deletePrivateFile(
    bucketName: string,
    objectName: string,
  ): Promise<void> {
    try {
      await this.minioClient.removeObject(bucketName, objectName);
    } catch (error) {
      this.logger.error(
        { error, objectName },
        "Failed to delete object from Minio",
      );
      throw error;
    }
  }
}
