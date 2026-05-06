/**
 * app.js
 *
 * Express application setup.
 * Mounts middleware and routes.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const attendanceRoutes = require('./src/routes/attendanceRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend')));
// Existing routes
app.use('/api', attendanceRoutes);

// New admin routes
app.use('/api/admin', adminRoutes);

module.exports = app;