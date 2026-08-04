import { Request, Response, NextFunction } from 'express';
import * as usersService from '../services/usersService';
import { success, created } from '../utils/response';
import { ForbiddenError } from '../utils/errors';
import { ROLES } from '../config/permissions';

function requireSuperAdmin(req: Request) {
  if (req.user?.role !== ROLES.SUPER_ADMIN) {
    throw new ForbiddenError('Only super admin can manage roles');
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    requireSuperAdmin(req);
    return success(res, await usersService.listUsers());
  } catch (e) {
    next(e);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    requireSuperAdmin(req);
    return created(res, await usersService.createUser(req.body), 'User created');
  } catch (e) {
    next(e);
  }
}

export async function createStaff(req: Request, res: Response, next: NextFunction) {
  try {
    requireSuperAdmin(req);
    return created(res, await usersService.createStaff(req.body), 'Staff member created');
  } catch (e) {
    next(e);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    requireSuperAdmin(req);
    return success(
      res,
      await usersService.updateRole(Number(req.params.id), req.body.role),
      'Role updated'
    );
  } catch (e) {
    next(e);
  }
}

export async function setActive(req: Request, res: Response, next: NextFunction) {
  try {
    requireSuperAdmin(req);
    const isActive = Boolean(req.body.is_active);
    return success(
      res,
      await usersService.setActive(Number(req.params.id), isActive),
      isActive ? 'User activated' : 'User deactivated'
    );
  } catch (e) {
    next(e);
  }
}
