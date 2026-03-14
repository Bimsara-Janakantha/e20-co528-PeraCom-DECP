import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type NotificationDocument = Notification & Document;

export enum ActionType {
  USER_LOGGED_IN = "USER_LOGGED_IN",
  SYSTEM_ALERT = "SYSTEM_ALERT",
  POST_REPOSTED = "POST_REPOSTED",
  INVITED = "INVITED",
  JOINED = "JOINED",
  REQUESTED_TO_JOIN = "REQUESTED_TO_JOIN",
  LIKED = "LIKED",
  COMMENTED = "COMMENTED",
  MESSAGE_RECEIVED = "MESSAGE_RECEIVED",
}

export enum EntityType {
  USER = "USER",
  PROJECT = "PROJECT",
  POST = "POST",
  COMMENT = "COMMENT",
  JOB = "JOB",
  EVENT = "EVENT",
  MESSAGE = "MESSAGE",
}

@Schema({ timestamps: true })
export class Notification {
  // Who is receiving this?
  @Prop({ required: true, index: true })
  recipientId!: string;

  // Who caused this? (Can be null for SYSTEM_ALERT)
  @Prop({ required: false })
  actorId?: string;

  // What did they do?
  @Prop({ type: String, enum: ActionType, required: true })
  actionType!: ActionType;

  // What did they do it to?
  @Prop({ type: String, enum: EntityType, required: true })
  entityType!: EntityType;

  // The ID of the Project, Post, or Message
  @Prop({ required: true })
  entityId!: string;

  // Optional extra context (e.g., the snippet of the message or the role they requested)
  // We use type mongoose.Schema.Types.Mixed to allow flexible JSON objects
  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  // Has the user seen it?
  @Prop({ default: false, index: true })
  isRead!: boolean;

  // Automatically delete notifications older than 90 days to save DB space
  @Prop({ type: Date, expires: "90d", default: Date.now })
  createdAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Compound index to instantly fetch a user's unread notifications
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
