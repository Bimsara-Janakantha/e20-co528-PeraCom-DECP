import { Kafka, type Consumer, type EachMessagePayload } from "kafkajs";
import type { BaseEvent } from "./index.js";

export type { Consumer } from "kafkajs";

// 1. INITIALIZE CONSUMER
export async function createConsumer(
  brokers: string[],
  groupId: string,
  topics: string[],
  fromBeginning: boolean = false,
  clientId: string = "decp-consumer",
): Promise<Consumer> {
  const kafka = new Kafka({
    clientId,
    brokers,
    retry: {
      initialRetryTime: 300,
      retries: 10, // Built-in resilience for network blips
    },
  });

  const consumer = kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    maxWaitTimeInMs: 5000,
  });

  await consumer.connect();

  await consumer.subscribe({ topics, fromBeginning });

  console.log(
    `🎧 Consumer connected to topics [${topics.join(", ")}] with group [${groupId}]`,
  );

  return consumer;
}

// 2. RUN CONSUMER (With Type Safety & Error Boundaries)
export async function startConsuming<T = any>(
  consumer: Consumer,
  messageHandler: (
    topic: string,
    event: BaseEvent<T>,
    partition: number,
  ) => Promise<void>,
) {
  await consumer.run({
    // autoCommit: true is the default, which is fine for our MVP.
    // In V2, we will set this to false and manually commit after the email successfully sends.
    eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
      if (!message.value) return;

      try {
        // Automatically parse the buffer into your strongly typed interface
        const event: BaseEvent<T> = JSON.parse(message.value.toString());

        // Pass the typed event to your NestJS service
        await messageHandler(topic, event, partition);
      } catch (error) {
        // 🛡️ CRASH PREVENTION
        // If another service accidentally sends malformed JSON, we catch it here.
        // If we didn't catch this, the unhandled promise rejection would crash the Node process.
        console.error(
          `🚨 Critical Error processing message from topic [${topic}]`,
          error,
        );
        console.error(`Faulty Message Payload:`, message.value.toString());

        // TODO: Send to Dead Letter Queue (DLQ) here
      }
    },
  });
}
