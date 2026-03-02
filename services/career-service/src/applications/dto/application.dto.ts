import { IsEnum, IsMongoId, IsNotEmpty } from "class-validator";
import { ApplicationStatus } from "../schemas/application.schema.js";

export class ApplyJobDto {
  @IsNotEmpty()
  @IsMongoId()
  jobId!: string;
}

export class UpdateApplicationStatusDto {
  @IsNotEmpty()
  @IsMongoId()
  applicationId!: string;

  @IsNotEmpty()
  @IsEnum(ApplicationStatus, { message: "Invalid status" })
  newStatus!: string;
}
