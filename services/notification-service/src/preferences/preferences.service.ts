import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  NotificationPreference,
  type NotificationPreferenceDocument,
} from "./schemas/preference.schema.js";

@Injectable()
export class PreferencesService {
  constructor(
    @InjectModel(NotificationPreference.name)
    private readonly preferenceModel: Model<NotificationPreferenceDocument>,
  ) {}

  // ========================================================================
  // GET USER PREFERENCES (With Default Fallback)
  // ========================================================================
  async getPreferences(recipientId: string) {
    let prefs = await this.preferenceModel
      .findOne({ userId: recipientId })
      .lean()
      .exec();

    // If they have never saved preferences before, return the schema's default structure
    if (!prefs) {
      prefs = new this.preferenceModel({ userId: recipientId }).toObject();
    }

    return prefs;
  }

  // ========================================================================
  // CREATE DEFAULT PREFERENCES (Called on User Signup)
  // ========================================================================
  async createUser(recipientId: string) {
    try {
      const newPrefs = await this.preferenceModel.create({
        userId: recipientId,
      });
      return newPrefs;
    } catch (error) {
      throw error;
    }
  }

  // ========================================================================
  // CREATE BULK DEFAULT PREFERENCES (Called on User Signup)
  // ========================================================================
  async createBulkUsers(users: { user_id: string }[]): Promise<any> {
    if (!users || users.length === 0) return null;

    // 1. Bulk Prepare Preferences
    const preferenceOps = users.map((user) => ({
      updateOne: {
        filter: { userId: user.user_id },
        update: { $setOnInsert: { userId: user.user_id } },
        upsert: true,
      },
    }));

    try {
      const newPrefs = await this.preferenceModel.bulkWrite(preferenceOps);
      return newPrefs;
    } catch (error) {
      // Optional: Log here or throw to let the processor handle it
      throw error;
    }
  }

  // ========================================================================
  // UPDATE PREFERENCES (The Upsert Pattern)
  // ========================================================================
  async updatePreferences(recipientId: string, updateData: any) {
    // 🛡️ The 'upsert: true' is enterprise magic.
    // If the document doesn't exist, MongoDB creates it instantly.
    // If it does exist, it merges the new toggles seamlessly.
    const updatedPrefs = await this.preferenceModel
      .findOneAndUpdate(
        { userId: recipientId },
        { $set: updateData },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return updatedPrefs;
  }
}
