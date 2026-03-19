import { NextApiRequest, NextApiResponse } from 'next';
import { serverAuthenticate } from '../constants/serverUtil';
import { PermissionSection, PermissionType } from '../constants/interfaces';

/**
 * Authenticate an admin API request. Returns the session user or null
 * (and sends a 401 response) if authentication fails.
 */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
  permissionType: PermissionType = PermissionType.Write,
) {
  return serverAuthenticate(req, res, {
    permission: PermissionSection.Orders,
    permissionType,
  });
}
