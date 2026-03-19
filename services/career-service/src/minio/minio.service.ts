import {
  Injectable,
  InternalServerErrorException,
  type OnModuleInit,
} from "@nestjs/common";
import { Client } from "minio";
import { env } from "../config/validateEnv.config.js";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

@Injectable()
export class MinioService implements OnModuleInit {
  private minioClient: Client;

  // Define your bucket names here for easy reference
  private readonly RESUME_BUCKET = env.MINIO_BUCKET_NAME;

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
  // LIFECYCLE HOOK: Auto-setup buckets when the module loads
  // ========================================================================
  async onModuleInit() {
    await this.setupPrivateBucket(this.RESUME_BUCKET);
  }

  // ========================================================================
  // AUTOMATED BUCKET SETUP (Private)
  // ========================================================================
  private async setupPrivateBucket(bucketName: string) {
    try {
      const exists = await this.minioClient.bucketExists(bucketName);

      if (!exists) {
        await this.minioClient.makeBucket(bucketName);
        this.logger.info(
          { bucketName },
          "Created missing private Minio bucket",
        );
      } else {
        this.logger.info({ bucketName }, "Private Minio bucket already exists");
      }
    } catch (error) {
      this.logger.error(
        { error, bucketName },
        "Failed to automate private Minio bucket setup",
      );
    }
  }

  // ========================================================================
  // PRIVATE FILE UPLOADS (Used by Career Service for Resumes)
  // ========================================================================
  async uploadPrivateFile(
    objectName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      await this.minioClient.putObject(
        this.RESUME_BUCKET,
        objectName,
        buffer,
        buffer.length,
        { "Content-Type": mimeType },
      );

      return objectName;
    } catch (error) {
      this.logger.error(
        { error, bucket: this.RESUME_BUCKET, objectName },
        "Failed to upload private file to Minio",
      );
      throw new InternalServerErrorException("File upload failed");
    }
  }

  // ========================================================================
  // GENERATE PRESIGNED URL (For Secure, Temporary File Access)
  // ========================================================================
  async generatePresignedGetUrl(
    objectName: string,
  ): Promise<string> {
    try {
      // ✨ Asks the Minio server to cryptographically sign a temporary URL
      const url = await this.minioClient.presignedGetObject(
        this.RESUME_BUCKET,
        objectName,
        env.VIEW_TIME_LIMIT_MINUTES * 60, // Default: 15 minutes
      );
      return url;
    } catch (error) {
      this.logger.error(
        { error, bucketName: this.RESUME_BUCKET, objectName },
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
    objectName: string,
  ): Promise<void> {
    try {
      await this.minioClient.removeObject(this.RESUME_BUCKET, objectName);
    } catch (error) {
      this.logger.error(
        { error, objectName },
        "Failed to delete object from Minio",
      );
      throw error;
    }
  }
}
