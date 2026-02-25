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
      const venues = await prisma.venue.findMany({
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
        },
        orderBy: {
          name: 'asc'
        }
      });
      res.status(200).json(venues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ error: "Failed to fetch venues" });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { name, address, city, postcode, description } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Venue name is required" });
      }

      // Check if venue name already exists
      const existingVenue = await prisma.venue.findUnique({
        where: { name: name.trim() }
      });

      if (existingVenue) {
        return res.status(400).json({ error: "A venue with this name already exists" });
      }

      const venue = await prisma.venue.create({
        data: {
          name: name.trim(),
          address: address?.trim() || null,
          city: city?.trim() || null,
          postcode: postcode?.trim() || null,
          description: description?.trim() || null,
          createdById: dbUser.id
        }
      });

      res.status(201).json(venue);
    } catch (error) {
      console.error("Error creating venue:", error);
      res.status(500).json({ error: "Failed to create venue" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
