/**
 * Slug generation and management utilities
 */

import prisma from '../lib/prisma';

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }

  return title
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all non-word characters except hyphens
    .replace(/[^\w-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Ensure a slug is unique by checking against existing events
 */
export async function ensureUniqueSlug(baseSlug: string, eventId?: number): Promise<string> {
  if (!baseSlug) {
    // Generate a fallback slug if empty
    baseSlug = `event-${Date.now()}`;
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingEvent = await prisma.event.findFirst({
      where: {
        slug,
        ...(eventId && { id: { not: eventId } }) // Exclude current event when updating
      }
    });

    if (!existingEvent) {
      return slug;
    }

    // If slug exists, append counter
    slug = `${baseSlug}-${counter}`;
    counter++;

    // Prevent infinite loop
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug after 1000 attempts');
    }
  }
}

/**
 * Generate slug for an event and ensure uniqueness
 */
export async function generateEventSlug(title: string, eventId?: number): Promise<string> {
  const baseSlug = generateSlug(title);

  if (!baseSlug) {
    // Fallback for empty titles
    return await ensureUniqueSlug(`event-${eventId || Date.now()}`, eventId);
  }

  return await ensureUniqueSlug(baseSlug, eventId);
}

/**
 * Validate if a string is a valid slug
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Slug should be lowercase, contain only letters, numbers, and hyphens
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  return slugRegex.test(slug) && slug.length <= 100;
}

/**
 * Generate public URL for an event
 */
export function getEventUrl(event: { id: number; slug?: string | null }): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tickets.jvs.org.uk';

  if (event.slug) {
    return `${baseUrl}/events/${event.slug}`;
  }

  // Fallback to ID-based URL if no slug
  return `${baseUrl}/events/${event.id}`;
}