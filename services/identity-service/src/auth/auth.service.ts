import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OAuth2Client } from "google-auth-library";
import { PrismaService } from "../prisma/prisma.service.js";
import { env } from "../config/validateEnv.config.js";
import { v7 as uuidv7 } from "uuid";
import { publishEvent } from "@decp/event-bus";

@Injectable()
export class AuthService {
  private client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async loginWithGoogle(idToken: string, correlationId: string) {
    let payload;

    // 1. Verify token with Google
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });

      payload = ticket.getPayload();
    } catch (error) {
      throw new UnauthorizedException("Invalid Google Token");
    }

    if (!payload) {
      throw new UnauthorizedException("No payload from Google");
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException("Google email not verified");
    }

    const email = payload.email;

    if (!email) {
      throw new UnauthorizedException("Email missing in Google token");
    }

    console.log("Google google payload:", payload);

    // 2. Check Database for user with email
    const user = await this.prisma.user.findUnique({
      where: { email: email, is_active: true },
    });

    // 3. If user doesn't exist, send the login is failed response.
    if (!user) {
      throw new UnauthorizedException(
        "User not found. Please contact the system administrator.",
      );
    }

    // 4. Generate Internal JWT Passport
    const jwtPayload = { sub: user.id, role: user.role };
    const token = this.jwtService.sign(jwtPayload);

    console.log("Generated JWT Payload:", jwtPayload);
    console.log("Generated JWT Token:", token);

    // 5. Kafka Event: User Login
    const loginEvent = {
      eventId: uuidv7(),
      eventType: "identity.user.login",
      eventVersion: "1.0",
      timestamp: new Date().toISOString(),
      producer: "identity-service",
      correlationId: correlationId,
      actorId: user.id,
      data: {
        user_id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    };

    await publishEvent("identity.events", loginEvent);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
      },
    };
  }
}
