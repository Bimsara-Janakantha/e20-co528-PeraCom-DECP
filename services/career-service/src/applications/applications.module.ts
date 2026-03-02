import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApplicationsController } from "./applications.controller.js";
import { ApplicationsService } from "./applications.service.js";
import {
  Application,
  ApplicationSchema,
} from "./schemas/application.schema.js";
import { Job, JobSchema } from "../jobs/schemas/job.schema.js";
import { MinioService } from "../minio/minio.service.js";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: Job.name, schema: JobSchema },
    ]),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, MinioService],
})
export class ApplicationsModule {}
