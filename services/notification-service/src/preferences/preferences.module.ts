import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PreferencesController } from "./preferences.controller.js";
import { PreferencesService } from "./preferences.service.js";
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from "./schemas/preference.schema.js";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: NotificationPreference.name,
        schema: NotificationPreferenceSchema,
      },
    ]),
  ],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
