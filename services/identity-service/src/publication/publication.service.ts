import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { v7 as uuidv7 } from "uuid";
import { publishEvent, type BaseEvent } from "@decp/event-bus";
import type {
  NewPublicationDto,
  UpdatePublicationDto,
} from "./dto/publication.dto.js";

@Injectable()
export class PublicationService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // VIEW ALL PUBLICATIONS FOR USER
  // ==========================================
  async viewPublications(
    actorId: string,
    correlationId: string,
    userId: string,
  ) {
    // 1. Fetch all publications for the user, ordered by creation date (newest first)
    const publications = await this.prisma.publication.findMany({
      where: { user_id: userId },
      orderBy: { createdAt: "desc" },
    });

    // 2. Emit event for viewing publications
    try {
      const viewedPublicationsEvent: BaseEvent<any> = {
        eventId: uuidv7(),
        eventType: "identity.publications.viewed",
        eventVersion: "1.0",
        timestamp: new Date().toISOString(),
        producer: "identity-service",
        correlationId,
        actorId,
        data: {
          user_id: userId,
          count: publications.length,
        },
      };
      await publishEvent("identity.events", viewedPublicationsEvent);
    } catch (error) {
      console.error("Failed to publish publications.viewed event:", error);
    }

    // 3. Return publications
    return { status: "ok", publications };
  }

  // ==========================================
  // CREATE PUBLICATION
  // ==========================================
  async createPublication(
    userId: string,
    correlationId: string,
    payload: NewPublicationDto,
  ) {
    // 1. Prevent duplication (same user, same title, same published_date)
    const existing = await this.prisma.publication.findFirst({
      where: {
        user_id: userId,
        title: payload.title.trim(),
        published_date: payload.published_date ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(
        "A publication with the same title and published date already exists for this user",
      );
    }

    // 2. Create the publication
    const newPublication = await this.prisma.publication.create({
      data: {
        id: uuidv7(),
        user_id: userId,
        title: payload.title.trim(),
        journal: payload.journal?.trim() ?? null,
        published_date: payload.published_date ?? null,
        link: payload.link?.trim() ?? null,
      },
    });

    // 3. If creation failed, throw an error
    if (!newPublication) {
      throw new BadRequestException("Failed to create publication");
    }

    // 4. Emit event for publication creation
    try {
      const createdPublicationEvent: BaseEvent<any> = {
        eventId: uuidv7(),
        eventType: "identity.publication.created",
        eventVersion: "1.0",
        timestamp: new Date().toISOString(),
        producer: "identity-service",
        correlationId,
        actorId: userId,
        data: {
          id: newPublication.id,
          user_id: userId,
          title: newPublication.title,
        },
      };
      await publishEvent("identity.events", createdPublicationEvent);
    } catch (error) {
      console.error("Failed to publish publication.created event:", error);
    }

    // 5. Return success response with the created publication
    return { status: "publication_created", publication: newPublication };
  }

  // ==========================================
  // DELETE PUBLICATION
  // ==========================================
  async deletePublication(
    userId: string,
    correlationId: string,
    publicationId: string,
  ) {
    // 1. Validate publication ID
    if (!publicationId) {
      throw new BadRequestException("Publication ID is required");
    }

    // 2. Attempt to delete the publication (only if it belongs to the user)
    const deletedPublication = await this.prisma.publication.delete({
      where: { id: publicationId, user_id: userId },
    });

    // 3. If no publication was deleted, it means it either doesn't exist or doesn't belong to the user
    if (!deletedPublication) {
      throw new NotFoundException("Publication not found");
    }

    // 4. Emit event for publication deletion
    try {
      const deletedPublicationEvent: BaseEvent<any> = {
        eventId: uuidv7(),
        eventType: "identity.publication.deleted",
        eventVersion: "1.0",
        timestamp: new Date().toISOString(),
        producer: "identity-service",
        correlationId,
        actorId: userId,
        data: {
          id: deletedPublication.id,
          user_id: userId,
        },
      };
      await publishEvent("identity.events", deletedPublicationEvent);
    } catch (error) {
      console.error("Failed to publish publication.deleted event:", error);
    }

    // 5. Return success response
    return { status: "publication_deleted", id: deletedPublication.id };
  }

  // ==========================================
  // UPDATE PUBLICATION
  // ==========================================
  async updatePublication(
    userId: string,
    correlationId: string,
    payload: UpdatePublicationDto,
  ) {
    // 1. Extract publication ID and update data from payload
    const { id, ...data } = payload;

    // 2. Validate publication exists and belongs to user
    const publication = await this.prisma.publication.findUnique({
      where: { id },
    });
    if (!publication) {
      throw new NotFoundException("Publication not found");
    }
    if (publication.user_id !== userId) {
      throw new ConflictException("You do not own this publication");
    }

    // 3. If title or published_date is being updated, check for duplicates
    if (data.title || data.published_date) {
      const duplicate = await this.prisma.publication.findFirst({
        where: {
          user_id: userId,
          title: data.title || publication.title,
          published_date: data.published_date || publication.published_date,
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictException(
          "A publication with the same title and published date already exists for this user",
        );
      }
    }

    // 4. Prepare update data (trim strings)
    const updateData: Record<string, any> = { ...data };
    for (const key in updateData) {
      if (
        typeof updateData[key] === "string" &&
        updateData[key].trim() !== "id"
      ) {
        updateData[key] = updateData[key].trim();
      }
    }

    // 5. Update the publication
    const updatedPublication = await this.prisma.publication.update({
      where: { id, user_id: userId },
      data: updateData,
    });

    // 6. If update failed, throw an error
    if (!updatedPublication) {
      throw new NotFoundException("Publication not found");
    }

    // 7. Emit event for publication update
    try {
      const updatedPublicationEvent: BaseEvent<any> = {
        eventId: uuidv7(),
        eventType: "identity.publication.updated",
        eventVersion: "1.0",
        timestamp: new Date().toISOString(),
        producer: "identity-service",
        correlationId,
        actorId: userId,
        data: {
          id: updatedPublication.id,
          user_id: userId,
          title: updatedPublication.title,
        },
      };
      await publishEvent("identity.events", updatedPublicationEvent);
    } catch (error) {
      console.error("Failed to publish publication.updated event:", error);
    }

    // 8. Return success response with the updated publication
    return { status: "publication_updated", publication: updatedPublication };
  }
}
