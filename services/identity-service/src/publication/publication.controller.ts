import {
  Controller,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Delete,
  Get,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CorrelationId } from "../auth/decorators/correlation-id.decorator.js";
import { ActorId } from "../auth/decorators/actor.decorator.js";
import type {
  NewPublicationDto,
  UpdatePublicationDto,
} from "./dto/publication.dto.js";
import type { PublicationService } from "./publication.service.js";

@Controller("publication")
export class PublicationController {
  constructor(private publicationService: PublicationService) {}

  // POST /publication
  @UseGuards(JwtAuthGuard)
  @Post()
  createPublication(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Body() payload: NewPublicationDto,
  ) {
    return this.publicationService.createPublication(
      actorId,
      correlationId,
      payload,
    );
  }

  // PATCH /publication
  @UseGuards(JwtAuthGuard)
  @Patch()
  updatePublication(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Body() payload: UpdatePublicationDto,
  ) {
    return this.publicationService.updatePublication(
      actorId,
      correlationId,
      payload,
    );
  }

  // DELETE /publication/:id
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  deletePublication(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Param("id") publicationId: string,
  ) {
    return this.publicationService.deletePublication(
      actorId,
      correlationId,
      publicationId,
    );
  }

  // GET /publication/:id
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  getAllPublications(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Param("id") userId: string,
  ) {
    return this.publicationService.viewPublications(
      actorId,
      correlationId,
      userId,
    );
  }
}
