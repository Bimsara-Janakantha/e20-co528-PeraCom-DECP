import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type NotificationPreferenceDocument = NotificationPreference & Document;

// 1. How does the user want to be contacted?
class Channels {
  @Prop({ default: true })
  inApp!: boolean; // The bell icon UI

  @Prop({ default: true })
  email!: boolean;

  @Prop({ default: false })
  push!: boolean; // Mobile push notifications (for future scaling)
}

// 2. What types of events do they care about?
class Categories {
  @Prop({ default: true })
  collaboration!: boolean; // Project invites, join requests

  @Prop({ default: true })
  direct_messages!: boolean; // Offline message alerts

  @Prop({ default: true })
  social_interactions!: boolean; // Likes, comments

  @Prop({ default: true })
  career_alerts!: boolean; // Job matches, application updates
}

@Schema({ timestamps: true })
export class NotificationPreference {
  // One preference document per user
  @Prop({ required: true, unique: true, index: true })
  userId!: string;

  @Prop({ type: Channels, default: () => new Channels() })
  channels!: Channels;

  @Prop({ type: Categories, default: () => new Categories() })
  categories!: Categories;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(
  NotificationPreference,
);
