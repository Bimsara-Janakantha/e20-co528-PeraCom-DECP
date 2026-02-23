import { Injectable } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service.js";
import { env } from "../../config/validateEnv.config.js";

@Injectable()
export class PresenceService {
  private readonly TTL_SECONDS = env.TTL_SECONDS;

  constructor(private readonly redisService: RedisService) {}

  async setOnline(userId: string) {
    const redis = this.redisService.getClient();

    await redis.set(`online:user:${userId}`, "1", "EX", this.TTL_SECONDS);
  }

  async isOnline(userId: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    const result = await redis.get(`online:user:${userId}`);
    return result === "1";
  }

  async setOffline(userId: string) {
    const redis = this.redisService.getClient();
    await redis.del(`online:user:${userId}`);
  }
}
