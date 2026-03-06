import { Controller, Post, Param, Body, UseGuards, Req } from "@nestjs/common";
import { MessagesService } from "./messages.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { ActorId } from "../auth/decorators/actor.decorator.js";

@Controller("conversations/:conversationId/attachments")
export class MessageAttachmentsController {
  constructor(private readonly messagesService: MessagesService) {}

  // POST /conversations/:conversationId/attachments/upload-url
  @UseGuards(JwtAuthGuard)
  @Post("upload-url")
  async getUploadUrl(
    @ActorId() actorId: string,
    @Param("conversationId") conversationId: string,
    @Body("fileName") fileName: string,
    @Body("mimeType") mimeType: string,
  ) {
    return this.messagesService.getAttachmentUploadUrl(
      actorId,
      conversationId,
      fileName,
      mimeType,
    );
  }

  // POST /conversations/:conversationId/attachments/download-url
  @UseGuards(JwtAuthGuard)
  @Post("download-url")
  async getDownloadUrl(
    @ActorId() actorId: string,
    @Param("conversationId") conversationId: string,
    @Body("messageId") messageId: string,
    @Body("fileKey") fileKey: string,
  ) {
    return this.messagesService.getAttachmentDownloadUrl(
      actorId,
      conversationId,
      messageId,
      fileKey,
    );
  }
}
