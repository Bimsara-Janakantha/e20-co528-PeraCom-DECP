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
import {
  NotificationPreference,
  type NotificationPreferenceDocument,
} from "../preferences/schemas/preference.schema.js";
import { EmailService } from "../emails/email.service.js";

type LoginEventData = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
};

@Injectable()
export class NotificationProcessorService {
  constructor(
    @InjectPinoLogger(NotificationProcessorService.name)
    private readonly logger: PinoLogger,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreference.name)
    private readonly preferenceModel: Model<NotificationPreferenceDocument>,
    private readonly emailService: EmailService,
  ) {}

  // ========================================================================
  // THE PREFERENCE ENGINE
  // ========================================================================
  private async getUserPreferences(userId: string) {
    // We try to find their explicit preferences. If they haven't set any,
    // the Mongoose default values (everything turned ON) will apply.
    let prefs = await this.preferenceModel.findOne({ userId }).lean().exec();

    if (!prefs) {
      prefs = new this.preferenceModel({ userId }).toObject();
    }
    return prefs;
  }

  // ========================================================================
  // 1. HANDLE USER LOGIN (Account Security)
  // ========================================================================
  async handleUserLogin(data: LoginEventData) {
    const recipientId = data.user_id;

    console.log("Handling user login event for user_id:", recipientId);

    // If no user_id drop notification
    if (!recipientId) {
      this.logger.warn(
        { data },
        "Dropped login event because user_id is missing",
      );
      return;
    }

    // Get user preference for notifications
    const prefs = await this.getUserPreferences(recipientId);
    if (!prefs.categories.account_security) {
      this.logger.debug(
        { recipientId },
        "User opted out of account security notifications. Dropping login alert.",
      );
      return;
    }

    const loginTime = new Date().toISOString();

    // Send email if prefered
    if (prefs.channels.email && data.email) {
      await this.emailService.sendLoginNotificationEmail({
        ...data,
        loginTime,
      });
      this.logger.info(
        `[MOCK] Sending Login Alert Email to ${data.email} for user ${recipientId}`,
      );
    }

    // Send In App Notification if prefered
    if (prefs.channels.inApp) {
      await this.notificationModel.create({
        recipientId,
        actorId: recipientId,
        actionType: ActionType.USER_LOGGED_IN,
        entityType: EntityType.USER,
        entityId: recipientId,
        metadata: {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          login_time: loginTime,
        },
      });
    }

    // Job completion message
    this.logger.info(
      { recipientId },
      "Processed login notification according to user preferences",
    );
  }

  /* // ========================================================================
  // 1. HANDLE PROJECT INVITATION (Outbound Invite)
  // ========================================================================
  async handleProjectInvitation(data: any) {
    const {
      invitation_id,
      project_id,
      project_title,
      inviter_id,
      invitee_id,
      invitee_email,
    } = data;

    this.logger.info(
      { invitee_id, project_id },
      "Processing project invitation notification",
    );

    // 1. Evaluate the Preference Matrix
    const prefs = await this.getUserPreferences(invitee_id);
    if (!prefs.categories.collaboration) {
      this.logger.debug(
        "User opted out of collaboration notifications. Dropping event.",
      );
      return;
    }

    // 2. Dispatch In-App Notification (If allowed)
    if (prefs.channels.inApp) {
      await this.notificationModel.create({
        recipientId: invitee_id,
        actorId: inviter_id,
        actionType: ActionType.INVITED,
        entityType: EntityType.PROJECT,
        entityId: project_id,
        metadata: {
          projectTitle: project_title,
          invitationId: invitation_id,
        },
      });
    }

    // 3. Dispatch Email (If allowed)
    if (prefs.channels.email && invitee_email) {
      // await this.emailService.sendProjectInvitationEmail({
      //   to: invitee_email,
      //   projectTitle: project_title,
      //   invitationLink: `https://decp.app/projects/${project_id}/join?token=${invitation_id}`
      // });
      this.logger.info(
        `[MOCK] Sending Email to ${invitee_email} for project invite`,
      );
    }
  }

  // ========================================================================
  // 2. HANDLE OFFLINE MESSAGE (Direct Messaging)
  // ========================================================================
  async handleOfflineMessage(data: any) {
    const {
      message_id,
      conversation_id,
      target_user_id,
      content_snippet,
      actorId,
    } = data;

    this.logger.info(
      { target_user_id, conversation_id },
      "Processing offline message alert",
    );

    const prefs = await this.getUserPreferences(target_user_id);

    // Strict category check
    if (!prefs.categories.direct_messages) return;

    // 1. In-App Bell Icon
    if (prefs.channels.inApp) {
      await this.notificationModel.create({
        recipientId: target_user_id,
        actorId: actorId, // The person who sent the message
        actionType: ActionType.MESSAGE_RECEIVED,
        entityType: EntityType.MESSAGE,
        entityId: conversation_id, // We link to the conversation, not the specific message
        metadata: {
          messageId: message_id,
          snippet: content_snippet, // e.g., "Sounds good, see you at 5!"
        },
      });
    }

    // 2. Email Dispatch
    if (prefs.channels.email) {
      // Because this is an offline ping, we might need to fetch the user's email
      // from the Identity Service first if it wasn't passed in the Kafka event payload.
      // await this.emailService.sendUnreadMessageAlert(target_user_id, content_snippet);
      this.logger.info(
        `[MOCK] Sending Offline Message Email to user ${target_user_id}`,
      );
    }
  }

  // ========================================================================
  // 3. HANDLE JOIN REQUEST & MEMBER JOINED
  // ========================================================================
  async handleJoinRequest(data: any) {
    // Note: To notify project owners about a join request, the Kafka payload
    // needs to either include an array of `owner_ids`, or this service needs to
    // query the Collaboration Service/Database to find out who the owners are.
    // For this example, we assume `target_owner_id` is passed.

    const {
      request_id,
      project_id,
      requester_id,
      project_title,
      target_owner_id,
    } = data;

    if (!target_owner_id) {
      this.logger.warn(
        "No target_owner_id provided in join_request event payload",
      );
      return;
    }

    const prefs = await this.getUserPreferences(target_owner_id);
    if (!prefs.categories.collaboration) return;

    if (prefs.channels.inApp) {
      await this.notificationModel.create({
        recipientId: target_owner_id,
        actorId: requester_id,
        actionType: ActionType.REQUESTED_TO_JOIN,
        entityType: EntityType.PROJECT,
        entityId: project_id,
        metadata: { projectTitle: project_title, requestId: request_id },
      });
    }

    // Email dispatch...
  }

  async handleMemberJoined(data: any) {
    const { project_id, user_id, role, project_title, target_owner_id } = data;
    // Similar implementation: evaluate matrix, save in-app, send email.
    // Inside NotificationProcessorService:
    /*     if (prefs.channels.email && invitee_email) {
    await this.emailService.sendProjectInvitationEmail({
        to: invitee_email,
        projectTitle: project_title,
        invitationLink: `https://decp.app/projects/${project_id}/join?token=${invitation_id}` // Frontend route
    });
    }
  } */
}
