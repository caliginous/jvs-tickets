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
      const venue = await prisma.venue.findUnique({
        where: { id: parseInt(String(id)) },
        include: {
          createdBy: {
            select: {
              id: true,
              userName: true,
              email: true
            }
          },
          _count: {
            select: {
              events: true
            }
          }
        }
      });

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      res.status(200).json(venue);
    } catch (error) {
      console.error("Error fetching venue:", error);
      res.status(500).json({ error: "Failed to fetch venue" });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const { name, address, city, postcode, description, isActive } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Venue name is required" });
      }

      // Check if venue name already exists (excluding current venue)
      const existingVenue = await prisma.venue.findFirst({
        where: { 
          name: name.trim(),
          id: { not: parseInt(String(id)) }
        }
      });

      if (existingVenue) {
        return res.status(400).json({ error: "A venue with this name already exists" });
      }

      const updatedVenue = await prisma.venue.update({
        where: { id: parseInt(String(id)) },
        data: {
          name: name.trim(),
          address: address?.trim() || null,
          city: city?.trim() || null,
          postcode: postcode?.trim() || null,
          description: description?.trim() || null,
          isActive: isActive !== undefined ? isActive : true
        }
      });

      res.status(200).json(updatedVenue);
    } catch (error) {
      console.error("Error updating venue:", error);
      res.status(500).json({ error: "Failed to update venue" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      // Check if venue is used by any events
      const eventsWithVenue = await prisma.event.findMany({
        where: { venueId: parseInt(String(id)) }
      });

      if (eventsWithVenue.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete venue that is used by events",
          usageCount: eventsWithVenue.length
        });
      }

      await prisma.venue.delete({
        where: { id: parseInt(String(id)) }
      });

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting venue:", error);
      res.status(500).json({ error: "Failed to delete venue" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
