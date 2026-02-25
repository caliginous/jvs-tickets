import { NextApiRequest, NextApiResponse } from "next";
import { serverAuthenticate } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import prisma from "../../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const sessionUser = await serverAuthenticate(req, res, {
    permission: PermissionSection.EventManagement,
    permissionType: req.method === "GET" ? PermissionType.Read : PermissionType.Write
  });
  if (!sessionUser) return;

  // Get the actual database user to access the ID
  const dbUser = await prisma.adminUser.findUnique({
    where: { email: sessionUser.email }
  });
  
  if (!dbUser) {
    return res.status(401).json({ error: "User not found in database" });
  }

  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const discountCode = await prisma.discountCode.findUnique({
        where: { id: String(id) },
        include: {
          createdBy: {
            select: {
              id: true,
              userName: true,
              email: true
            }
          }
        }
      });

      if (!discountCode) {
        return res.status(404).json({ error: "Discount code not found" });
      }

      res.status(200).json(discountCode);
    } catch (error) {
      console.error("Error fetching discount code:", error);
      res.status(500).json({ error: "Failed to fetch discount code" });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const {
        code,
        description,
        discountType,
        discountValue,
        validFrom,
        validUntil,
        usageLimit,
        isActive,
        appliesToEvents,
        appliesToCategories,
        minimumOrderValue,
        maximumDiscount
      } = req.body;

      // Validate required fields
      if (!code || !discountType || discountValue === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if code already exists (excluding current code)
      const existingCode = await prisma.discountCode.findFirst({
        where: { 
          code: code.toUpperCase(),
          id: { not: String(id) }
        }
      });

      if (existingCode) {
        return res.status(400).json({ error: "Discount code already exists" });
      }

      // Validate discount value
      if (discountType === "percentage" && (discountValue < 0 || discountValue > 100)) {
        return res.status(400).json({ error: "Percentage must be between 0 and 100" });
      }

      if (discountType === "fixed" && discountValue < 0) {
        return res.status(400).json({ error: "Fixed amount cannot be negative" });
      }

      // Update discount code
      const updatedDiscountCode = await prisma.discountCode.update({
        where: { id: String(id) },
        data: {
          code: code.toUpperCase(),
          description,
          discountType,
          discountValue,
          validFrom: new Date(validFrom),
          validUntil: validUntil ? new Date(validUntil) : null,
          usageLimit: usageLimit ? parseInt(usageLimit) : null,
          isActive,
          appliesToEvents: (appliesToEvents || []).map(String).filter((v) => v && v.trim() !== ''), // Convert to strings and drop empties
          appliesToCategories: (appliesToCategories || []).map(String).filter((v) => v && v.trim() !== ''), // Convert to strings and drop empties
          minimumOrderValue: minimumOrderValue ? parseFloat(minimumOrderValue) : null,
          maximumDiscount: maximumDiscount ? parseFloat(maximumDiscount) : null
        }
      });

      res.status(200).json(updatedDiscountCode);
    } catch (error) {
      console.error("Error updating discount code:", error);
      res.status(500).json({ error: "Failed to update discount code" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      // Check if discount code has been used in orders
      const ordersWithCode = await prisma.order.findMany({
        where: { discountCodeId: String(id) }
      });

      if (ordersWithCode.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete discount code that has been used in orders",
          usageCount: ordersWithCode.length
        });
      }

      await prisma.discountCode.delete({
        where: { id: String(id) }
      });

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting discount code:", error);
      res.status(500).json({ error: "Failed to delete discount code" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
