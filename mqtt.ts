import mqtt from "mqtt";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["flight-tracker", "mqtt"]);

const brokerUrl = Deno.env.get("MQTT_BROKER_URL");
if (!brokerUrl) {
  throw new Error("MQTT_BROKER_URL environment variable is not set");
}

const client = mqtt.connect(brokerUrl);

client.on("connect", () => {
  logger.info("Connected to MQTT broker");
});

client.on("error", (error) => {
  logger.error("MQTT connection error: {error}", { error });
});

export function publish(topic: string, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!client.connected) {
      client.reconnect();
    }

    client.publish(topic, message, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
