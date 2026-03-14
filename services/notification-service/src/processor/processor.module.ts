import { Module } from "@nestjs/common";
import { IdentityNotificationService } from "./identity-notification.service.js";
import { EngagementNotificationService } from "./engagement-notification.service.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { PreferencesModule } from "../preferences/preferences.module.js";
// You can remove the PreferencesService import here as well

@Module({
  imports: [NotificationsModule, PreferencesModule],
  providers: [
    IdentityNotificationService,
    EngagementNotificationService,
    // REMOVED PreferencesService HERE
  ],
  exports: [IdentityNotificationService, EngagementNotificationService],
})
export class ProcessorModule {}
