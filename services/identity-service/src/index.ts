import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { connectProducer } from "@decp/event-bus";
import { env } from "./config/validateEnv.config.js";
import { ValidationPipe } from "@nestjs/common/pipes/index.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Initialize the Kafka shared event bus connection
  await connectProducer([env.KAFKA_BROKER]);

  // 2. Allow Prisma to disconnect gracefully when the app stops
  app.enableShutdownHooks();

  // 3. The security scheild
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  await app.listen(env.NODE_PORT);
}

bootstrap();
