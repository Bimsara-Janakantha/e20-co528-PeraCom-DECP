import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt"; // For WS Authentication
import { MessagingGateway } from "./messaging.gateway.js";
import { ConversationsModule } from "../conversations/conversations.module.js";
import { MessagesModule } from "../messages/messages.module.js";
import { env } from "../config/validateEnv.config.js";

@Module({
  imports: [
    ConversationsModule,
    MessagesModule,
    // Provide JWT config so the Gateway can verify handshake tokens
    JwtModule.register({
      secret: env.JWT_SECRET,
    }),
    // PresenceModule is @Global, so PresenceService is automatically available
  ],
  providers: [MessagingGateway],
})
export class MessagingModule {}
