import { Router, Request, Response } from "express";
import { z } from "zod";
import { contactMessageSchema } from "../validation/contact.schema";
import { ContactMessageData, ContactMessageResponse, ApiResponse } from "../types";
import { firestore } from "../config/firebase";
import { verifyToken } from "../middleware/authMiddleware";
import { AuthenticatedRequest } from "../types";
import { contactLimiter } from "../middleware/rateLimiter";
import { EmailService } from "../services/email.service";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Contact form submission endpoint
router.post("/message", contactLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request body
    let validatedData;
    try {
      validatedData = contactMessageSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid contact form data",
            code: "contact/invalid-data",
            details: error.errors.map((e) => e.message).join(", "),
          },
        } as ApiResponse<never>);
      }
      throw error;
    }

    // Generate unique message ID
    const messageId = `contact_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    
    // Get user ID if authenticated
    let userId: string | undefined;
    try {
      const token = req.cookies?.token;
      if (token) {
        const { auth } = await import("../config/firebase");
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
      }
    } catch (error) {
      // User not authenticated or invalid token - continue as anonymous
      userId = undefined;
    }

    // Create contact message data
    const contactMessage: ContactMessageData = {
      id: messageId,
      userId: userId,
      firstName: validatedData.firstName.trim(),
      lastName: validatedData.lastName.trim(),
      email: validatedData.email.trim().toLowerCase(),
      phone: validatedData.phone.trim(),
      message: validatedData.message.trim(),
      agreeToTerms: validatedData.agreeToTerms,
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Prepare Firestore data (remove undefined values)
    const firestoreData = {
      id: messageId,
      ...(userId && { userId }),
      firstName: validatedData.firstName.trim(),
      lastName: validatedData.lastName.trim(),
      email: validatedData.email.trim().toLowerCase(),
      phone: validatedData.phone.trim(),
      message: validatedData.message.trim(),
      agreeToTerms: validatedData.agreeToTerms,
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in Firestore
    await firestore.collection("contact_messages").doc(messageId).set(firestoreData);

    // Send email notification to support team
    try {
      await EmailService.sendContactNotification(contactMessage);
    } catch (emailError) {
      console.error("❌ Failed to send contact notification email:", emailError);
      // Don't fail the request if email fails - message is still stored
    }

    // Return success response
    const response: ContactMessageResponse = {
      success: true,
      message: "Contact message sent successfully",
      messageId: messageId,
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error("❌ Contact form submission error:", error);

    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to send contact message",
        code: "contact/server-error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Get contact messages (admin only)
router.get("/messages", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user?.role || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: {
          message: "Admin access required",
          code: "contact/admin-required",
        },
      } as ApiResponse<never>);
    }

    // Get query parameters
    const { status, limit = "50", offset = "0" } = req.query;
    
    let query = firestore.collection("contact_messages").orderBy("createdAt", "desc");
    
    // Filter by status if provided
    if (status && typeof status === "string" && ["new", "in_progress", "resolved"].includes(status)) {
      query = query.where("status", "==", status);
    }
    
    // Apply pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    
    if (offsetNum > 0) {
      const offsetSnapshot = await firestore.collection("contact_messages")
        .orderBy("createdAt", "desc")
        .limit(offsetNum)
        .get();
      
      const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.limit(limitNum).get();
    
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ContactMessageData[];

    return res.json({
      success: true,
      data: {
        messages,
        total: messages.length,
        hasMore: messages.length === limitNum,
      },
    });

  } catch (error) {
    console.error("❌ Failed to fetch contact messages:", error);

    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch contact messages",
        code: "contact/fetch-error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Update contact message status (admin only)
router.put("/messages/:id/status", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user?.role || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: {
          message: "Admin access required",
          code: "contact/admin-required",
        },
      } as ApiResponse<never>);
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body;

    // Validate status
    if (!status || !["new", "in_progress", "resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid status. Must be 'new', 'in_progress', or 'resolved'",
          code: "contact/invalid-status",
        },
      } as ApiResponse<never>);
    }

    // Update message
    const updateData: Partial<ContactMessageData> = {
      status: status as "new" | "in_progress" | "resolved",
      updatedAt: new Date().toISOString(),
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await firestore.collection("contact_messages").doc(id).update(updateData);

    return res.json({
      success: true,
      message: "Contact message status updated successfully",
    });

  } catch (error) {
    console.error("❌ Failed to update contact message status:", error);

    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to update contact message status",
        code: "contact/update-error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

export default router;
