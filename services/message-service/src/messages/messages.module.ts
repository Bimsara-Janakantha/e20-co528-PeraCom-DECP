import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MessageAttachmentsController } from "./messages.controller.js";
import { MessagesService } from "./messages.service.js";
import { Message, MessageSchema } from "./schemas/message.schema.js";
import {
  Conversation,
  ConversationSchema,
} from "../conversations/schemas/conversation.schema.js";
import { MinioService } from "../minio/minio.service.js";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    // Note: StorageModule is @Global, so MinioService is already available here!
  ],
  controllers: [MessageAttachmentsController],
  providers: [MessagesService, MinioService], // MinioService is injected here for attachment handling
  exports: [MessagesService], // Exported so the Gateway can use it
})
export class MessagesModule {}
