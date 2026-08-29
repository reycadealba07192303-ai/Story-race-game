require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const campaignRoutes = require('./src/routes/campaignRoutes');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const sectionRoutes = require('./src/routes/sectionRoutes');
const academicYearRoutes = require('./src/routes/academicYearRoutes');
const chatRoutes = require('./src/routes/chatRoutes');

// Initialize Firebase Admin
require('./src/config/firebase');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/settings', require('./src/routes/settingsRoutes'));
app.use('/api/audit', require('./src/routes/auditRoutes'));

if (!process.env.MONGO_URI) {
    console.error('❌ FATAL ERROR: MONGO_URI is not defined in .env');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Connected to MongoDB successfully'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Root Endpoint
app.get('/', (req, res) => {
    res.send('AI Gamified Campaign Builder API is running...');
});

// Health Check Endpoint for Uptime Robot
app.get('/api/health', (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    res.status(mongoReady ? 200 : 503).json({
        status: mongoReady ? 'OK' : 'DEGRADED',
        message: mongoReady ? 'Server is alive' : 'Server is up but database is not connected',
        mongo: mongoReady ? 'connected' : 'disconnected',
        ai: {
            groq: Boolean(process.env.GROQ_API_KEY),
            gemini: Boolean(process.env.GEMINI_API_KEY),
        },
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
