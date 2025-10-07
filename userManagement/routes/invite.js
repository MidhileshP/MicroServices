import express from 'express';
import {
  createInvite,
  acceptInvite,
  getInviteDetails,
  listInvites,
  revokeInvite
} from '../controllers/inviteController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createInviteValidation, acceptInviteValidation } from '../middleware/validation.js';

const router = express.Router();

router.post(
  '/create',
  authenticate,
  authorize('super_admin', 'site_admin', 'operator', 'client_admin'),
  createInviteValidation,
  createInvite
);

router.post('/accept', acceptInviteValidation, acceptInvite);

router.get('/details/:token', getInviteDetails);

router.get(
  '/list',
  authenticate,
  authorize('super_admin', 'site_admin', 'operator', 'client_admin'),
  listInvites
);

router.delete(
  '/:inviteId/revoke',
  authenticate,
  authorize('super_admin', 'site_admin', 'operator', 'client_admin'),
  revokeInvite
);

export default router;
