import { Router, Request, Response } from "express";

const router = Router();

router.post(
  "/stripe",
  async (req: Request, res: Response) => {
  
    console.log("[Webhook] Received POST to /api/webhooks/stripe");
    console.log(`[Webhook] req.body type: ${req.body.constructor.name}`);
    console.log(`[Webhook] req.body is Buffer: ${Buffer.isBuffer(req.body)}`);
    
    if (Buffer.isBuffer(req.body)) {
      console.log(`[Webhook] Buffer length: ${req.body.length} bytes`);
      console.log(`[Webhook] Buffer (first 100 chars): ${req.body.toString().substring(0, 100)}`);
    }

    

    res.status(200).json({ received: true });
  }
);

export default router;
