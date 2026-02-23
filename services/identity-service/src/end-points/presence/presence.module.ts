import { Module } from "@nestjs/common";
import { JwtStrategy } from "../../strategies/jwt.strategy.js";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard.js";

@Module({
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class PresenceModule {}
