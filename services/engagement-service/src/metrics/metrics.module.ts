import { Module } from "@nestjs/common";
import {
  makeCounterProvider,
  PrometheusModule,
} from "@willsoto/nestjs-prometheus";
import { env } from "../config/validateEnv.config.js";

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
    }),
  ],

  providers: [
    makeCounterProvider({
      name: `${env.SERVICE_NAME}_requests_total`,
      help: "Total HTTP requests",
    }),
  ],

  exports: [],
})
export class MetricsModule {}
