import { Router } from 'express';
import authRoutes from './auth';
import contentRoutes from './content';
import creatorRoutes from './creators';
import subscriptionRoutes from './subscriptions';
import adminRoutes from './admin';
import notificationRoutes from './notifications';
import dashboardRoutes from './dashboard';
import pollRoutes from './polls';
import partnerRoutes from './partners';
import shopRoutes from './shop';
import { getPublicCss, getPublicSettings } from '../controllers/settings.controller';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/content', contentRoutes);
router.use('/creators', creatorRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/polls', pollRoutes);
router.use('/partners', partnerRoutes);
router.use('/shop', shopRoutes);
router.get('/site-settings/css', getPublicCss);
router.get('/site-settings/public', getPublicSettings);
