import { Injectable, type OnModuleInit } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { env } from "../config/validateEnv.config.js";

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectPinoLogger(EmailService.name)
    private readonly logger: PinoLogger,
  ) {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: Number(env.SMTP_PORT) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.info(
        "... Email Service connected to SMTP provider successfully ...",
      );
    } catch (error) {
      this.logger.error(
        { error },
        "Failed to connect to SMTP provider on boot",
      );
    }
  }

  /*
   * Internal helper to load an HTML file from the templates directory.
   * It checks both 'dist' (production) and 'src' (development) folders.
   */
  private loadTemplate(templateName: string): string {
    const fileName = templateName.endsWith(".html")
      ? templateName
      : `${templateName}.html`;

    const paths = [
      path.join(process.cwd(), "dist", "emails", "templates", fileName),
      path.join(process.cwd(), "src", "emails", "templates", fileName),
    ];

    for (const targetPath of paths) {
      if (existsSync(targetPath)) {
        return readFileSync(targetPath, "utf-8");
      }
    }

    this.logger.error(
      { fileName, searchedPaths: paths },
      "Email template file not found!",
    );
    throw new Error(`Template ${fileName} not found on disk.`);
  }

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
      throw error;
    }
  }

  // ========================================================================
  // DOMAIN SPECIFIC EMAIL DISPATCHERS
  // ========================================================================

  /* Function to send login notification */
  async sendLoginNotificationEmail(payload: {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    loginTime: string;
  }) {
    const subject = "Security Alert: New login to your PeraCom DECP account";
    const fullName = `${payload.first_name} ${payload.last_name}`.trim();

    // 1. Select and load the template by name
    let html = this.loadTemplate("login-notification");

    // 2. Perform replacements
    html = html
      .replaceAll("{{FULL_NAME}}", fullName)
      .replaceAll("{{EMAIL}}", payload.email)
      .replaceAll("{{ROLE}}", payload.role)
      .replaceAll("{{LOGIN_TIME}}", payload.loginTime);

    await this.sendMail(payload.email, subject, html);
  }

  /* Function to send project invitation email */
  async sendProjectInvitationEmail(payload: {
    to: string;
    projectTitle: string;
    invitationLink: string;
  }) {
    const subject = `You have been invited to join ${payload.projectTitle}`;

    let html = this.loadTemplate("project-invitation");

    html = html
      .replaceAll("{{PROJECT_TITLE}}", payload.projectTitle)
      .replaceAll("{{INVITATION_LINK}}", payload.invitationLink);

    await this.sendMail(payload.to, subject, html);
  }
}
