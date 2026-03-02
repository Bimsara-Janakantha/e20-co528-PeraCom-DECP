import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApplicationsService } from "./applications.service.js";
import {
  ApplyJobDto,
  UpdateApplicationStatusDto,
} from "./dto/application.dto.js";
import { ApplicationStatus } from "./schemas/application.schema.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { ActorId } from "../auth/decorators/actor.decorator.js";
import { CorrelationId } from "../auth/decorators/correlation-id.decorator.js";
import { env } from "../config/validateEnv.config.js";

@Controller("applications")
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // POST /applications
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STUDENT", "ALUMNI")
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "resume", maxCount: 1 },
        { name: "coverLetter", maxCount: 1 },
      ],
      {
        limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
      },
    ),
  )
  async applyForJob(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Body() payload: ApplyJobDto,
    @UploadedFiles()
    files: {
      resume: Express.Multer.File[];
      coverLetter?: Express.Multer.File[];
    },
  ) {
    return this.applicationsService.applyForJob(
      actorId,
      correlationId,
      payload,
      files.resume[0] as Express.Multer.File,
      files.coverLetter?.[0] as Express.Multer.File,
    );
  }

  // DELETE /applications/:applicationId
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STUDENT", "ALUMNI")
  @Delete(":applicationId")
  async withdrawApplication(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Param("applicationId") applicationId: string,
  ) {
    return this.applicationsService.withdrawApplication(
      actorId,
      correlationId,
      applicationId,
    );
  }

  // PATCH /applications/status
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ALUMNI")
  @Patch("status")
  async updateApplicationStatus(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Body() payload: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateApplicationStatus(
      actorId,
      correlationId,
      payload,
    );
  }

  // GET /applications/url/:applicationId
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STUDENT", "ALUMNI")
  @Get("url/:applicationId")
  async getResumeDownloadUrl(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Param("applicationId") applicationId: string,
  ) {
    return this.applicationsService.getResumeDownloadUrl(
      actorId,
      correlationId,
      applicationId,
    );
  }

  // GET /applications/job/:jobId?cursor=xxx&limit=10&status=SUBMITTED
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ALUMNI")
  @Get("job/:jobId")
  async getApplicationsForJob(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Param("jobId") jobId: string,
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query("status") statusFilter?: ApplicationStatus,
  ) {
    return this.applicationsService.getApplicationsForJob(
      actorId,
      jobId,
      correlationId,
      cursor,
      limit,
      statusFilter,
    );
  }

  // GET /applications/me?cursor=xxx&limit=10
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STUDENT", "ALUMNI")
  @Get("me")
  async getUserApplications(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.applicationsService.getUserApplications(
      actorId,
      correlationId,
      cursor,
      limit,
    );
  }
}
