import { Module } from "@nestjs/common";
import { PublicationService } from "./publication.service.js";
import { PublicationController } from "./publication.controller.js";

@Module({
  providers: [PublicationService],
  controllers: [PublicationController],
})
export class PublicationModule {}
