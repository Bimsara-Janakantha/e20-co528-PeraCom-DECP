import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import { createConsumer, startConsuming } from "@decp/event-bus";
import type { BaseEvent, Consumer } from "@decp/event-bus";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

// We will build this service next, it holds the actual business logic
import { NotificationProcessorService } from "../processor/notification-processor.service.js";
import { env } from "../config/validateEnv.config.js";

@Injectable()
export class NotificationConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  private consumer!: Consumer;

  constructor(
    @InjectPinoLogger(NotificationConsumerService.name)
    private readonly logger: PinoLogger,
    private readonly processorService: NotificationProcessorService,
  ) {}

  // ========================================================================
  // START CONSUMING ON BOOT
  // ========================================================================
  async onModuleInit() {
    this.logger.info("Initializing Kafka Consumer for Notifications...");

    try {
      // 1. Connect and Subscribe
      // We listen to all major domain topics.
      this.consumer = await createConsumer(
        [env.KAFKA_BROKER],
        "notification-service-group", // Unique group ID for this microservice
        [
          "collaboration.events",
          "engagement.events",
          "career.events",
          "identity.events",
        ],
        false, // Do NOT read from the beginning
        "notification-consumer-client",
      );

      // 2. Start the Infinite Listening Loop
      await startConsuming(this.consumer, async (topic, event) => {
        await this.routeEvent(topic, event);
      });
    } catch (error) {
      this.logger.error("Failed to initialize Kafka consumer", error);
      // Depending on your deployment strategy, you might want to process.exit(1) here
      // so Kubernetes knows the pod is unhealthy and restarts it.
    }
  }

  // ========================================================================
  // THE ROUTER (Switchboard)
  // ========================================================================
  private async routeEvent(topic: string, event: BaseEvent<any>) {
    this.logger.debug(
      `Received event [${event.eventType}] from topic [${topic}]`,
    );

    try {
      // We route the event to the correct business logic handler based on its type.
      switch (event.eventType) {
        // --- COLLABORATION EVENTS ---
        case "collaboration.join_request.created":
          await this.processorService.handleJoinRequest(event.data);
          break;
        case "collaboration.member.invitation_created":
          await this.processorService.handleProjectInvitation(event.data);
          break;
        case "collaboration.member.joined":
          await this.processorService.handleMemberJoined(event.data);
          break;

        // --- MESSAGING EVENTS ---
        case "message.unread.offline":
          await this.processorService.handleOfflineMessage(event.data);
          break;

        // --- ENGAGEMENT EVENTS (Future) ---
        case "post.liked":
        case "comment.created":
          // await this.processorService.handleSocialInteraction(event.data);
          break;

        default:
          this.logger.warn(`Unhandled event type: ${event.eventType}`);
        // We safely ignore events we don't care about.
      }
    } catch (error) {
      this.logger.error(
        `Failed to process event ${event.eventId} (${event.eventType})`,
        error,
      );
      // 🛡️ Note: Because we catch the error here, the `startConsuming` loop will
      // not crash, and Kafka will move on to the next message.
    }
  }

  // ========================================================================
  // GRACEFUL SHUTDOWN
  // ========================================================================
  async onModuleDestroy() {
    if (this.consumer) {
      this.logger.info("Disconnecting Kafka Consumer...");
      await this.consumer.disconnect();
    }
  }
}
