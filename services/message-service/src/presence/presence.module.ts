import { Module, Global } from "@nestjs/common";
import { createClient } from "redis";
import { PresenceService } from "./presence.service.js";
import { env } from "../config/validateEnv.config.js";
import { Logger } from "@nestjs/common";

@Global()
@Module({
  providers: [
    {
      provide: "REDIS_CLIENT",
      useFactory: async () => {
        const client = createClient({ url: env.REDIS_URL });
        client.on("error", (err) =>
          new Logger("RedisClient").error("Redis Client Error", err),
        );
        await client.connect();
        return client;
      },
    },
    PresenceService,
  ],
  exports: ["REDIS_CLIENT", PresenceService],
})
export class PresenceModule {}
