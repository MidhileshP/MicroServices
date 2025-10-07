import express from 'express';
import {
  getOrganization,
  updateOrganization,
  getOrganizationMembers
} from '../controllers/organizationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('client_admin', 'client_user'),
  getOrganization
);

router.put(
  '/',
  authenticate,
  authorize('client_admin'),
  updateOrganization
);

router.get(
  '/members',
  authenticate,
  authorize('client_admin', 'client_user'),
  getOrganizationMembers
);

export default router;
