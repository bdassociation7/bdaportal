import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  handleWooCommerceOrderWebhook,
  handleWebhookHealth,
} from "./routes/woocommerce-webhook";
import {
  handleWordPressSyncWebhook,
  handleWordPressSyncHealth,
} from "./routes/wordpress-sync-webhook";
import { handleGenerateCertificate } from "./routes/certificate-generate";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  // WooCommerce Webhook routes
  // POST endpoint for WooCommerce order webhooks (membership activation)
  app.post("/api/webhooks/woocommerce/order", handleWooCommerceOrderWebhook);
  // Health check for webhook endpoint
  app.get("/api/webhooks/woocommerce/health", handleWebhookHealth);

  // WordPress Sync Webhook routes
  // POST endpoint for WordPress user sync (user creation, profile updates)
  app.post("/api/webhooks/wordpress/sync", handleWordPressSyncWebhook);
  // Health check for WordPress sync webhook
  app.get("/api/webhooks/wordpress/health", handleWordPressSyncHealth);

  // Certificate generation - generates PDF on-the-fly and returns it
  app.get("/api/certificates/generate/:credentialId", handleGenerateCertificate);

  return app;
}
