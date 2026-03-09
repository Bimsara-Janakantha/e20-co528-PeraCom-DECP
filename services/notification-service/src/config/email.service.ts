import { Injectable, type OnModuleInit } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { env } from "../config/validateEnv.config.js";

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectPinoLogger(EmailService.name)
    private readonly logger: PinoLogger,
  ) {
    // Initialize the Nodemailer transporter with connection pooling
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: Number(env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      pool: true, // ✨ Enterprise feature: Reuses TCP connections for bulk sending
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  async onModuleInit() {
    try {
      // Verify the connection configuration on boot
      await this.transporter.verify();
      this.logger.info(
        "📧 Email Service connected to SMTP provider successfully.",
      );
    } catch (error) {
      this.logger.error(
        { error },
        "Failed to connect to SMTP provider on boot",
      );
      // We don't crash the app here, just log the error.
      // The app can still process in-app notifications even if the email provider is down.
    }
  }

  // ========================================================================
  // CORE SEND METHOD (Private)
  // ========================================================================
  private async sendMail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html,
      });

      this.logger.debug(
        { messageId: info.messageId, to },
        "Email dispatched successfully",
      );
      return true;
    } catch (error) {
      this.logger.error({ error, to, subject }, "Failed to dispatch email");
      throw error; // Throwing allows the Processor to potentially send it to a Dead Letter Queue
    }
  }

  // ========================================================================
  // DOMAIN SPECIFIC EMAIL TEMPLATES
  // ========================================================================

  async sendProjectInvitationEmail(payload: {
    to: string;
    projectTitle: string;
    invitationLink: string;
  }) {
    const subject = `You have been invited to join ${payload.projectTitle}`;

    // In a massive enterprise app, you'd use a template engine like Handlebars (.hbs)
    // For this MVP, native template literals keep it blazing fast and zero-dependency.
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #333;">Research Collaboration Invitation</h2>
        <p style="color: #555; line-height: 1.5;">
          Hello, <br><br>
          You have been invited to collaborate on the project: <strong>${payload.projectTitle}</strong>.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${payload.invitationLink}" style="background-color: #0056b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Invitation
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    await this.sendMail(payload.to, subject, html);
  }

  async sendUnreadMessageAlert(to: string, snippet: string) {
    const subject = `New unread message waiting for you`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h3 style="color: #333;">You have a new message</h3>
        <blockquote style="border-left: 4px solid #0056b3; padding-left: 15px; color: #666; font-style: italic;">
          "${snippet}..."
        </blockquote>
        <p>
          <a href="https://decp.app/messages" style="color: #0056b3;">Click here to reply</a>
        </p>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }
}
