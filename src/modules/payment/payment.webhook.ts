// import { Request, Response } from "express";
// import crypto from "crypto";
// import { PaymentService } from "./payment.service";
// import logger from "@utils/logger";
// import prisma from "@config/database";

// const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

// export class PaymentWebhookHandler {
  
//   // Verify Paystack signature
//   private static verifyPaystackSignature(req: Request): boolean {
//     const hash = crypto
//       .createHmac("sha512", PAYSTACK_SECRET_KEY)
//       .update(JSON.stringify(req.body))
//       .digest("hex");

//     return hash === req.headers["x-paystack-signature"];
//   }

//   // Handle Paystack webhooks
//   static async handlePaystackWebhook(req: Request, res: Response) {
//     try {
//       // Verify signature
//       if (!this.verifyPaystackSignature(req)) {
//         logger.warn("Invalid Paystack webhook signature");
//         return res.status(400).json({ error: "Invalid signature" });
//       }

//       const event = req.body;
      
//       logger.info(`Paystack webhook received: ${event.event}`, {
//         event: event.event,
//         reference: event.data?.reference,
//       });

//       // Handle different event types
//       switch (event.event) {
//         case "charge.success":
//           await this.handleChargeSuccess(event.data);
//           break;

//         case "charge.failed":
//           await this.handleChargeFailed(event.data);
//           break;

//         case "transfer.success":
//           // Handle refunds
//           await this.handleTransferSuccess(event.data);
//           break;

//         case "transfer.failed":
//           await this.handleTransferFailed(event.data);
//           break;

//         default:
//           logger.info(`Unhandled webhook event: ${event.event}`);
//       }

//       // Always return 200 to acknowledge receipt
//       return res.status(200).json({ status: "success" });
//     } catch (error: any) {
//       logger.error("Webhook processing error:", error);
//       // Still return 200 to prevent retries for invalid data
//       return res.status(200).json({ status: "error", message: error.message });
//     }
//   }

//   // Handle successful charge
//   private static async handleChargeSuccess(data: any) {
//     try {
//       const reference = data.reference;
//       const metadata = data.metadata;

//       logger.info(`Processing successful charge: ${reference}`);

//       // Find payment by Paystack reference
//       const payment = await prisma.payment.findUnique({
//         where: { paystackReference: reference },
//       });

//       if (!payment) {
//         // Try to find by our internal reference in metadata
//         const internalRef = metadata?.payment_reference;
//         if (internalRef) {
//           const paymentByRef = await prisma.payment.findUnique({
//             where: { reference: internalRef },
//           });

//           if (paymentByRef) {
//             await PaymentService.verifyPayment(internalRef, { status: true, data });
//             return;
//           }
//         }

//         logger.warn(`Payment not found for reference: ${reference}`);
//         return;
//       }

//       // Verify and update payment
//       await PaymentService.verifyPayment(payment.reference, { status: true, data });

//       logger.info(`Payment ${payment.reference} processed successfully via webhook`);
//     } catch (error: any) {
//       logger.error("Error processing charge.success webhook:", error);
//       throw error;
//     }
//   }

//   // Handle failed charge
//   private static async handleChargeFailed(data: any) {
//     try {
//       const reference = data.reference;

//       logger.info(`Processing failed charge: ${reference}`);

//       const payment = await prisma.payment.findUnique({
//         where: { paystackReference: reference },
//       });

//       if (!payment) {
//         logger.warn(`Payment not found for failed charge: ${reference}`);
//         return;
//       }

//       // Update payment status
//       await prisma.$transaction(async (tx) => {
//         await tx.payment.update({
//           where: { id: payment.id },
//           data: {
//             status: "FAILED",
//             lastCheckedAt: new Date(),
//           },
//         });

//         // Update transaction
//         await tx.paymentTransaction.updateMany({
//           where: {
//             paymentId: payment.id,
//             paystackReference: reference,
//           },
//           data: {
//             status: "FAILED",
//             failedAt: new Date(),
//             gatewayResponse: JSON.parse(JSON.stringify(data)),
//             gatewayMessage: data.gateway_response,
//           },
//         });

//         // Audit log
//         await tx.paymentAuditLog.create({
//           data: {
//             paymentId: payment.id,
//             action: "PAYMENT_FAILED_WEBHOOK",
//             description: `Payment failed: ${data.gateway_response}`,
//             actorType: "WEBHOOK",
//             metadata: { gateway_response: data.gateway_response },
//           },
//         });
//       });

//       logger.info(`Payment ${payment.reference} marked as failed via webhook`);
//     } catch (error: any) {
//       logger.error("Error processing charge.failed webhook:", error);
//       throw error;
//     }
//   }

//   // Handle successful refund
//   private static async handleTransferSuccess(data: any) {
//     try {
//       logger.info(`Refund successful: ${data.reference}`);

//       // Find refund record
//       const refund = await prisma.paymentRefund.findUnique({
//         where: { paystackReference: data.reference },
//       });

//       if (!refund) {
//         logger.warn(`Refund not found: ${data.reference}`);
//         return;
//       }

//       // Update refund status
//       await prisma.$transaction(async (tx) => {
//         await tx.paymentRefund.update({
//           where: { id: refund.id },
//           data: {
//             status: "COMPLETED",
//             completedAt: new Date(),
//             gatewayResponse: JSON.parse(JSON.stringify(data)),
//           },
//         });

//         // Audit log
//         await tx.paymentAuditLog.create({
//           data: {
//             paymentId: refund.paymentId,
//             action: "REFUND_COMPLETED_WEBHOOK",
//             description: `Refund completed: ${refund.reference}`,
//             actorType: "WEBHOOK",
//             metadata: { refund_reference: refund.reference },
//           },
//         });
//       });

//       logger.info(`Refund ${refund.reference} completed via webhook`);
//     } catch (error: any) {
//       logger.error("Error processing transfer.success webhook:", error);
//       throw error;
//     }
//   }

//   // Handle failed refund
//   private static async handleTransferFailed(data: any) {
//     try {
//       logger.info(`Refund failed: ${data.reference}`);

//       const refund = await prisma.paymentRefund.findUnique({
//         where: { paystackReference: data.reference },
//       });

//       if (!refund) {
//         logger.warn(`Refund not found: ${data.reference}`);
//         return;
//       }

//       // Update refund status
//       await prisma.paymentRefund.update({
//         where: { id: refund.id },
//         data: {
//           status: "FAILED",
//           gatewayResponse: JSON.parse(JSON.stringify(data)),
//         },
//       });

//       logger.info(`Refund ${refund.reference} marked as failed via webhook`);
//     } catch (error: any) {
//       logger.error("Error processing transfer.failed webhook:", error);
//       throw error;
//     }
//   }
// }


// //main -> route Todo
// // import { PaymentWebhookHandler } from "./modules/payment/payment.webhook";
// // app.post("/api/v1/webhooks/paystack", express.raw({ type: "application/json" }), PaymentWebhookHandler.handlePaystackWebhook);

