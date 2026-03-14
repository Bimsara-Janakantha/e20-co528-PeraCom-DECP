import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type NotificationPreferenceDocument = NotificationPreference & Document;

// --- 1. Define Sub-Schemas ---

@Schema({ _id: false }) // _id: false prevents Mongoose from creating sub-IDs
class Channels {
  @Prop({ default: true })
  inApp!: boolean;

  @Prop({ default: true })
  email!: boolean;

  @Prop({ default: false })
  push!: boolean;
}
const ChannelsSchema = SchemaFactory.createForClass(Channels);

@Schema({ _id: false })
class Categories {
  @Prop({ default: true })
  collaboration!: boolean;

  @Prop({ default: true })
  direct_messages!: boolean;

  @Prop({ default: true })
  social_interactions!: boolean;

  @Prop({ default: true })
  career_alerts!: boolean;

  @Prop({ default: true })
  account_security!: boolean;
}
const CategoriesSchema = SchemaFactory.createForClass(Categories);

// --- 2. Define Main Schema ---

@Schema({ timestamps: true })
export class NotificationPreference {
  @Prop({ required: true, unique: true, index: true })
  userId!: string;

  // Use the Schema types here to ensure defaults are respected
  @Prop({ type: ChannelsSchema, default: () => ({}) })
  channels!: Channels;

  @Prop({ type: CategoriesSchema, default: () => ({}) })
  categories!: Categories;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(
  NotificationPreference,
);
