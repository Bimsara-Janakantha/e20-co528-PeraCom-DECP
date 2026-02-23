import { Controller, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard.js";
import { PresenceService } from "./presence.service.js";

@Controller("presence")
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @UseGuards(JwtAuthGuard)
  @Post("heartbeat")
  async heartbeat(@Req() req: any) {
    const userId = req.user.sub;

    await this.presenceService.setOnline(userId);

    return { status: "online" };
  }
}
