const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { UPLOAD_DIR } = require('./middleware/upload');

const authRoutes = require('./routes/auth.routes');
const departmentsRoutes = require('./routes/departments.routes');
const categoriesRoutes = require('./routes/categories.routes');
const employeesRoutes = require('./routes/employees.routes');
const { router: assetsRoutes } = require('./routes/assets.routes');
const allocationsRoutes = require('./routes/allocations.routes');
const bookingsRoutes = require('./routes/bookings.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const auditsRoutes = require('./routes/audits.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const logsRoutes = require('./routes/logs.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/allocations', allocationsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/audits', auditsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
