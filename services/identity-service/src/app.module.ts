import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./end-points/auth/auth.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { env } from "./config/validateEnv.config.js";
import { RedisModule } from "./redis/redis.module.js";
import { PresenceModule } from "./end-points/presence/presence.module.js";

@Module({
  imports: [
    // Loads the environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => env],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    PresenceModule,
  ],
})
export class AppModule {}
