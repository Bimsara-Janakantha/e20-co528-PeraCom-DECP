import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import {
  Notification,
  ActionType,
  EntityType,
  type NotificationDocument,
} from "../notifications/schemas/notification.schema.js";
import { EmailService } from "../emails/email.service.js";
import { PreferencesService } from "../preferences/preferences.service.js";

@Injectable()
export class EngagementNotificationService {
  constructor(
    @InjectPinoLogger(EngagementNotificationService.name)
    private readonly logger: PinoLogger,

    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly emailService: EmailService,
    private readonly preferenceService: PreferencesService,
  ) {}
  // ========================================================================
  // 2.0 HANDLE NEW POST CREATED (Notify Followers)
  // ========================================================================
  async handlePostCreated(postId: string, actorId?: string) {
    this.logger.info(
      { postId, actorId },
      "Processing new post created event for notifications",
    );

    if (!postId || !actorId) return;

    // Step A: Check Preferences
    const prefs = await this.preferenceService.getPreferences(actorId);

    // Step B: In-App Notification
    if (prefs.channels.inApp) {
      await this.notificationModel.create({
        recipientId: actorId, // post creator
        actorId: "system", // Admin triggered
        actionType: ActionType.SYSTEM_ALERT,
        entityType: EntityType.POST,
        entityId: postId,
        metadata: {
          message:
            "Your new post has been successfully created and is now live on the platform.",
        },
      });
      this.logger.info(
        { recipientId: actorId },
        "Created post created in-app notification",
      );
    }

    // Step C: No Email Dispatch

    this.logger.info(
      { recipientId: actorId },
      "Successfully processed new post created event",
    );
  }
}
