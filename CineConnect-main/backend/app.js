const express = require('express');
const cors    = require('cors');

const authRoutes        = require('./routes/authRoutes');
const profileRoutes     = require('./routes/profileRoutes');
const projectRoutes     = require('./routes/projectRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const ratingRoutes      = require('./routes/ratingRoutes');
const messageRoutes     = require('./routes/messageRoutes');
const analyticsRoutes   = require('./routes/analyticsRoutes');
const creditRoutes      = require('./routes/creditRoutes');
const portfolioRoutes   = require('./routes/portfolioRoutes');
const followRoutes      = require('./routes/followRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const { sendSuccess }                    = require('./utils/apiResponse');
const { notFoundHandler, errorHandler }  = require('./middleware/errorHandler');

const app = express();

// CORS — open in development
app.use(cors());
// Default express.json() body limit (100kb) is too small for profile/cover
// photos sent as base64 data URIs (see PROFILE_EDITING.md) — raised to 6mb,
// comfortably above the 2MB-per-image cap profileService.js enforces.
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// Health check
app.get('/api/health', (req, res) =>
  sendSuccess(res, 200, 'CineConnect_KE API is running', {
    service: 'cineconnect-ke-backend',
    status:  'healthy',
  })
);

// Routes
app.use('/api/auth',         authRoutes);
app.use('/api/profiles',     profileRoutes);
app.use('/api/projects',     projectRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ratings',      ratingRoutes);
app.use('/api/messages',     messageRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/credits',      creditRoutes);
app.use('/api/portfolio',    portfolioRoutes);
app.use('/api/follows',      followRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
