require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, and images are allowed.'));
    }
  }
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create credentials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS credentials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        instructions TEXT,
        status VARCHAR(50) DEFAULT 'needed',
        credential_data TEXT,
        file_path VARCHAR(500),
        file_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create appointments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        credential_id INTEGER REFERENCES credentials(id),
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_date 
      ON appointments(appointment_date, appointment_time)
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Seed initial credentials from the HTML analysis
async function seedCredentials() {
  const client = await pool.connect();
  try {
    const credentials = [
      {
        name: 'Render Account Setup',
        description: 'Create Render account and provide admin access',
        instructions: `Step 1: Go to https://render.com and click "Get Started"
Step 2: Sign up using your business email address
Step 3: Once logged in, go to Account Settings (click your profile icon in top right)
Step 4: Navigate to the "Members" or "Team" section
Step 5: Add danny@nbrain.ai as an admin/owner to your account
Step 6: Reply to this email confirming the invite was sent`
      },
      {
        name: 'Pinecone Account Setup',
        description: 'Create Pinecone account and provide API credentials',
        instructions: `Step 1: Go to https://www.pinecone.io and click "Sign Up Free"
Step 2: Create your account using your business email
Step 3: Once logged in, you'll be taken to the dashboard
Step 4: Click on "API Keys" in the left sidebar
Step 5: Copy your API Key and Environment name
Step 6: Create your first index by clicking "Create Index":
   - Index Name: "ingram-documents" (or your preferred name)
   - Dimensions: 1536
   - Metric: cosine
   - Click "Create Index"
Step 7: Upload your API Key, Environment, and Index Name using the form below`
      },
      {
        name: 'Database Access Credentials',
        description: 'PostgreSQL database connection details',
        instructions: `Please provide the following PostgreSQL database credentials:
- Database Host
- Database Port
- Database Name
- Database Username
- Database Password

Format: postgresql://username:password@host:port/database`
      },
      {
        name: 'AWS S3 Credentials',
        description: 'AWS S3 bucket access for document storage',
        instructions: `Please provide the following AWS credentials:
- AWS Access Key ID
- AWS Secret Access Key
- S3 Bucket Name
- AWS Region

These will be used for secure document storage and retrieval.`
      },
      {
        name: 'Email Service Configuration',
        description: 'SMTP credentials for email notifications',
        instructions: `Please provide email service credentials:
- SMTP Host
- SMTP Port
- SMTP Username
- SMTP Password
- From Email Address

This will enable automated notifications and reports.`
      }
    ];

    for (const cred of credentials) {
      await client.query(
        `INSERT INTO credentials (name, description, instructions, status)
         VALUES ($1, $2, $3, 'needed')
         ON CONFLICT (name) DO NOTHING`,
        [cred.name, cred.description, cred.instructions]
      );
    }

    console.log('Credentials seeded successfully');
  } catch (error) {
    console.error('Error seeding credentials:', error);
  } finally {
    client.release();
  }
}

// API Routes

// Get all credentials
app.get('/api/credentials', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM credentials ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

// Get single credential
app.get('/api/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM credentials WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching credential:', error);
    res.status(500).json({ error: 'Failed to fetch credential' });
  }
});

// Upload credential (text or file)
app.post('/api/credentials/:id/upload', upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { credential_text } = req.body;
    
    let updateData = {
      status: 'completed',
      updated_at: new Date()
    };

    if (req.file) {
      // File upload
      updateData.file_path = req.file.path;
      updateData.file_type = req.file.mimetype;
      updateData.credential_data = `File uploaded: ${req.file.originalname}`;
    } else if (credential_text) {
      // Text input
      updateData.credential_data = credential_text;
    } else {
      return res.status(400).json({ error: 'No credential data provided' });
    }

    await client.query(
      `UPDATE credentials 
       SET status = $1, credential_data = $2, file_path = $3, file_type = $4, updated_at = $5
       WHERE id = $6`,
      [updateData.status, updateData.credential_data, updateData.file_path || null, 
       updateData.file_type || null, updateData.updated_at, id]
    );

    const result = await client.query(
      'SELECT * FROM credentials WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Credential uploaded successfully',
      credential: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading credential:', error);
    res.status(500).json({ error: 'Failed to upload credential' });
  } finally {
    client.release();
  }
});

// Get available appointment slots
app.get('/api/appointments/available', async (req, res) => {
  try {
    const { date } = req.query;
    
    // Get booked appointments for the date
    const bookedSlots = await pool.query(
      'SELECT appointment_time FROM appointments WHERE appointment_date = $1 AND status = $2',
      [date, 'scheduled']
    );
    
    const bookedTimes = bookedSlots.rows.map(row => row.appointment_time);
    
    // Generate available slots (10:00 AM - 4:00 PM PST, 30-minute increments)
    const availableSlots = [];
    for (let hour = 10; hour < 16; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        if (!bookedTimes.includes(timeStr)) {
          availableSlots.push(timeStr);
        }
      }
    }
    
    res.json({ available: availableSlots });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

// Book an appointment
app.post('/api/appointments', async (req, res) => {
  const client = await pool.connect();
  try {
    const { credential_id, appointment_date, appointment_time } = req.body;
    
    // Check if slot is still available
    const existing = await client.query(
      `SELECT id FROM appointments 
       WHERE appointment_date = $1 AND appointment_time = $2 AND status = 'scheduled'`,
      [appointment_date, appointment_time]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This time slot is no longer available' });
    }
    
    // Book the appointment
    const result = await client.query(
      `INSERT INTO appointments (credential_id, appointment_date, appointment_time, status)
       VALUES ($1, $2, $3, 'scheduled')
       RETURNING *`,
      [credential_id, appointment_date, appointment_time]
    );
    
    res.json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  } finally {
    client.release();
  }
});

// Get all appointments
app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, c.name as credential_name 
       FROM appointments a
       LEFT JOIN credentials c ON a.credential_id = c.id
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize and start server
async function startServer() {
  try {
    await initializeDatabase();
    await seedCredentials();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

