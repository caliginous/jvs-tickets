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

  if (req.method === "GET") {
    try {
      const discountCodes = await prisma.discountCode.findMany({
        include: {
          createdBy: {
            select: {
              id: true,
              userName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      res.status(200).json(discountCodes);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      res.status(500).json({ error: "Failed to fetch discount codes" });
    }
    return;
  }

  if (req.method === "POST") {
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
        minimumOrderValue,
        maximumDiscount
      } = req.body;

      // Validate required fields
      if (!code || !discountType || discountValue === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if code already exists
      const existingCode = await prisma.discountCode.findUnique({
        where: { code: code.toUpperCase() }
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

      // Create discount code
      const discountCode = await prisma.discountCode.create({
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
          minimumOrderValue: minimumOrderValue ? parseFloat(minimumOrderValue) : null,
          maximumDiscount: maximumDiscount ? parseFloat(maximumDiscount) : null,
          createdById: dbUser.id
        }
      });

      res.status(201).json(discountCode);
    } catch (error) {
      console.error("Error creating discount code:", error);
      res.status(500).json({ error: "Failed to create discount code" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
