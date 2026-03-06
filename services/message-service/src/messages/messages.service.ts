import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Message, type MessageDocument } from "./schemas/message.schema.js";
import {
  Conversation,
  type ConversationDocument,
} from "../conversations/schemas/conversation.schema.js";
import { v7 as uuidv7 } from "uuid";
import { MinioService } from "../minio/minio.service.js";

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,

    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    
    private readonly minioService: MinioService,
  ) {}

  // ========================================================================
  // SAVE MESSAGE (With Idempotency & Inbox Update)
  // ========================================================================
  async processNewMessage(
    senderId: string,
    conversationId: string,
    clientMessageId: string,
    content: string,
  ) {
    let savedMessage: MessageDocument;

    try {
      // 1. Attempt to save the message
      const newMessage = new this.messageModel({
        clientMessageId,
        conversationId: new Types.ObjectId(conversationId),
        senderId,
        content,
      });
      savedMessage = await newMessage.save();
    } catch (error: any) {
      // 🛡️ THE IDEMPOTENCY SHIELD
      if (error.code === 11000) {
        this.logger.warn(
          `Idempotent retry detected for message ${clientMessageId}`,
        );
        // The message is already in the DB. Fetch it and return it as if it just succeeded.
        const existingMessage = await this.messageModel
          .findOne({ clientMessageId })
          .exec();
        if (!existingMessage)
          throw new InternalServerErrorException("Failed to recover message");
        savedMessage = existingMessage;
      } else {
        throw error;
      }
    }

    // 2. Update the Conversation Inbox details
    // We do this asynchronously (fire-and-forget) so we don't block the WebSocket response
    const snippet = content ? content.substring(0, 50) : "Attachment";

    const updatedConversation = await this.conversationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(conversationId) },
        {
          $set: {
            lastMessageSnippet: snippet,
            lastMessageSenderId: senderId,
            lastMessageAt: savedMessage.createdAt,
          },
        },
        { new: true }, // Return the updated document so we can see the participants
      )
      .lean()
      .exec();

    return {
      savedMessage,
      participants: updatedConversation?.participants || [],
    };
  }

  // ========================================================================
  // GET ATTACHMENT UPLOAD URL (Direct to MinIO)
  // ========================================================================
  async getAttachmentUploadUrl(
    actorId: string,
    conversationId: string,
    fileName: string,
    mimeType: string,
  ) {
    if (!Types.ObjectId.isValid(conversationId))
      throw new BadRequestException("Invalid ID");

    // 1. Security Check: Is the user in this chat?
    const isParticipant = await this.conversationModel.exists({
      _id: new Types.ObjectId(conversationId),
      "participants.userId": actorId,
    });

    if (!isParticipant) {
      throw new ForbiddenException(
        "You cannot upload files to a conversation you are not part of.",
      );
    }

    // 2. Security Check: Block dangerous executables
    const blockedTypes = [
      "application/x-msdownload",
      "application/x-sh",
      "text/javascript",
    ];
    if (blockedTypes.includes(mimeType)) {
      throw new BadRequestException(
        "This file type is not allowed for security reasons.",
      );
    }

    // 3. Generate a secure path
    const extension = fileName.split(".").pop() || "bin";
    const fileKey = `chats/${conversationId}/${uuidv7()}.${extension}`;

    try {
      // 4. Ask MinIO for a PUT URL valid for 5 minutes
      const uploadUrl = await this.minioService.generatePresignedPutUrl(
        "chat-attachments",
        fileKey,
        5 * 60,
      );

      return {
        uploadUrl,
        fileKey, // The frontend must save this and send it in the WebSocket payload!
        expiresIn: 300,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        "Storage system is temporarily unavailable.",
      );
    }
  }

  // ========================================================================
  // GET ATTACHMENT DOWNLOAD URL (Secure Viewing)
  // ========================================================================
  async getAttachmentDownloadUrl(
    actorId: string,
    conversationId: string,
    messageId: string,
    fileKey: string,
  ) {
    // 1. Security Check: Is the user in this chat?
    const isParticipant = await this.conversationModel.exists({
      _id: new Types.ObjectId(conversationId),
      "participants.userId": actorId,
    });

    if (!isParticipant) {
      throw new ForbiddenException("You do not have access to this file.");
    }

    // 2. Optional: Verify the fileKey actually belongs to this message
    // (Prevents someone from guessing fileKeys from other chats)
    const message = await this.messageModel
      .findOne({
        _id: new Types.ObjectId(messageId),
        conversationId: new Types.ObjectId(conversationId),
        "attachments.fileKey": fileKey,
      })
      .lean()
      .exec();

    if (!message)
      throw new NotFoundException("Attachment not found in this message.");

    // 3. Ask MinIO for a GET URL valid for 15 minutes
    const downloadUrl = await this.minioService.generatePresignedGetUrl(
      "chat-attachments",
      fileKey,
      15 * 60,
    );

    return { downloadUrl };
  }
}
