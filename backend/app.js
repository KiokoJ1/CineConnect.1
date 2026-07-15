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
const adminRoutes       = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const userRoutes        = require('./routes/userRoutes');

const { sendSuccess }                    = require('./utils/apiResponse');
const { notFoundHandler, errorHandler }  = require('./middleware/errorHandler');

const app = express();

// CORS — open in development
app.use(cors());
// Default 100kb is too small for base64-encoded profile/cover photo uploads.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

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
app.use('/api/admin',        adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users',        userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
