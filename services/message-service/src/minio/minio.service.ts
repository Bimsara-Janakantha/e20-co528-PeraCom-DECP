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
  // GENERATE PRESIGNED GET URL (Secure Downloads)
  // ========================================================================
  async generatePresignedGetUrl(
    bucketName: string,
    objectName: string,
    expiryInSeconds: number = 900, // Default to 15 minutes
  ): Promise<string> {
    try {
      // The official MinIO SDK method for generating a temporary GET ticket
      const url = await this.minioClient.presignedGetObject(
        bucketName,
        objectName,
        expiryInSeconds,
      );
      return url;
    } catch (error) {
      this.logger.error(
        { error, bucketName, objectName },
        "Failed to generate presigned GET URL from Minio",
      );
      throw new InternalServerErrorException(
        "Failed to generate secure file link",
      );
    }
  }

  // ========================================================================
  // GENERATE PRESIGNED PUT URL (Direct-to-Storage Uploads)
  // ========================================================================
  async generatePresignedPutUrl(
    bucketName: string,
    objectName: string,
    expiryInSeconds: number = 900, // Default to 15 minutes
  ): Promise<string> {
    try {
      // The official MinIO SDK method for generating a temporary PUT ticket
      const url = await this.minioClient.presignedPutObject(
        bucketName,
        objectName,
        expiryInSeconds,
      );
      return url;
    } catch (error) {
      this.logger.error(
        { error, bucketName, objectName },
        "Failed to generate presigned PUT URL from Minio",
      );
      throw new InternalServerErrorException(
        "Storage system is temporarily unavailable",
      );
    }
  }

  async uploadFile(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    mimeType: string,
  ) {
    await this.minioClient.putObject(
      bucket,
      objectName,
      buffer,
      buffer.length,
      {
        "Content-Type": mimeType,
      },
    );

    return `${env.MINIO_PUBLIC_URL}/${bucket}/${objectName}`;
  }

  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    try {
      // The official Minio SDK method for deleting files
      await this.minioClient.removeObject(bucketName, objectName);
    } catch (error) {
      // We log the error but don't crash the app,
      // as file deletion failures shouldn't stop the user experience.
      this.logger.error(
        { error, objectName },
        "Failed to delete object from Minio",
      );
      throw new InternalServerErrorException("Failed to delete file");
    }
  }
}
