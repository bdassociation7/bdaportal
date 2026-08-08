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
import { handleCredentialOG } from "./routes/credential-og";
import { handleImportDocxQuestions } from "./routes/import-docx-questions";
import { handleTrainerInvite } from "./routes/trainer-invite";
import { handleCreateInstructor } from "./routes/create-instructor";

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

  // Credential verification pages — serve dynamic OG meta tags for social crawlers
  // These routes must be registered BEFORE the static SPA catch-all in node-build.ts
  app.get("/verify/:credentialId", handleCredentialOG);
  app.get("/public/verify/:credentialId", handleCredentialOG);

  // DOCX question import — parses Word file and returns structured questions
  app.post("/api/exam-questions/import-docx", handleImportDocxQuestions);

  // Trainer invite — sends magic link to trainer email
  app.post("/api/trainers/invite", handleTrainerInvite);

  // Create independent instructor — creates account + cert + sends invite in one step
  app.post("/api/instructors/create", handleCreateInstructor);

  return app;
}
