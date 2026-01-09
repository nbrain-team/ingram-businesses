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
        name VARCHAR(255),
        company_name VARCHAR(255),
        email VARCHAR(255),
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Migrate existing appointments table if columns don't exist
    try {
      await client.query(`
        ALTER TABLE appointments 
        ADD COLUMN IF NOT EXISTS name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS email VARCHAR(255)
      `);
    } catch (error) {
      console.log('Migration may have already run or columns exist:', error.message);
    }

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
        name: 'Paycom',
        description: 'HRIS, Payroll, Employee Data',
        instructions: `Step 1: Log into Paycom
Go to www.paycomonline.net and sign in with your admin credentials.

Step 2: Navigate to API Settings
Click your name in the top right → Setup → Security → API Access
(If you can't find it, look for "Integrations," "Developer Settings," or "API Management." Contact Paycom support at 1-800-580-4505 if needed.)

Step 3: Create New API Key
Click "Generate New API Key" or "Create API Credentials"
Set the following permissions:
- Read Access: Employee Data, Time & Attendance, Payroll (historical only)
- NO Write/Edit Access

Step 4: Name Your API Key
Use a descriptive name: "nBrain AI Integration - Read Only - Jan 2026"

Step 5: Copy & Save the API Key
Paycom will display your API key ONCE. Copy it immediately and save it securely.
⚠️ Important: You won't be able to see this key again. If you lose it, you'll need to generate a new one.

What to Upload:
- API Key (the long string of characters)
- Your Paycom company ID (if prompted during setup)
- Confirmation of read-only permissions enabled`
      },
      {
        name: 'SAP',
        description: 'ERP, Financial Data, Operations',
        instructions: `Step 1: Contact Your SAP Basis Administrator
SAP API access typically requires BASIS team involvement. Identify your SAP technical contact.

Step 2: Request OData Service Access
Ask your SAP admin to create an OData service account with read-only access.
Provide them with this information:
- Purpose: AI Brain data integration (read-only)
- Required Modules: FI (Finance), CO (Controlling), MM (Materials Management)
- Access Type: OData API or REST API

Step 3: Obtain Service Credentials
Your SAP admin will provide:
- API endpoint URL (e.g., https://your-sap-system.com/sap/opu/odata/...)
- Service username
- Service password or API key
- Client number (if applicable)

Step 4: Test the Connection
Ask your SAP admin to verify the service is active and accessible.

What to Upload:
- OData service URL
- Service account username
- Service account password/API key
- Client number (if applicable)
- SAP system type (S/4HANA, ECC, Business One, etc.)

💡 Alternative: If your SAP admin prefers, they can contact our technical team directly to discuss the integration approach.`
      },
      {
        name: 'Fleetio',
        description: 'Fleet Management, Maintenance Records',
        instructions: `Step 1: Log into Fleetio
Go to secure.fleetio.com and sign in with your admin account.

Step 2: Navigate to API Settings
Click Settings (gear icon) → API Keys
Direct link: https://secure.fleetio.com/api_keys

Step 3: Create New API Key
Click "New API Key"
Fill in the details:
- Name: nBrain AI Integration
- Permissions: Read Only
- Scopes: Check "All" or select: Vehicles, Service Entries, Issues, Inspections, Fuel Entries

Step 4: Generate & Copy the Key
Click "Create API Key"
Copy the API key that appears (it's a long string starting with sk_...)

Step 5: Note Your Account ID
While in Fleetio, note your Account ID (visible in the URL or under Settings)

What to Upload:
- API Key (starts with sk_...)
- Fleetio Account ID`
      },
      {
        name: 'Motive (formerly KeepTruckin)',
        description: 'GPS Tracking, Telematics, Pre-Trip Inspections',
        instructions: `Step 1: Log into Motive Dashboard
Go to gomotive.com or your custom Motive URL and sign in with admin credentials.

Step 2: Access Developer Settings
Click your profile icon → Settings → Developer (or Integrations)
💡 Note: The exact menu may vary. Look for "API Access," "Developer Tools," or "App Marketplace."

Step 3: Generate API Token
Click "Generate New API Token" or "Create API Key"
Configure:
- Name: nBrain AI Integration
- Permissions: Read Only (no write access)
- Access: Vehicles, Drivers, DVIR (inspections), Location, HOS

Step 4: Save the Access Token
Copy the access token immediately (you won't be able to see it again)

Step 5: Note Your Company ID
Find your Motive Company ID in Settings → Company Info

What to Upload:
- API Access Token
- Motive Company ID
- Confirmation of read-only permissions`
      },
      {
        name: 'KPA Flex',
        description: 'Safety Data, Compliance, Incident Management',
        instructions: `Step 1: Contact KPA Support
KPA Flex API access typically requires assistance from KPA support.
Call KPA Support: 1-866-356-1735
Or email: support@kpa.io

Step 2: Request API Access
Tell KPA Support:
- "We need API access for a third-party AI integration"
- "Read-only access to safety data, incidents, inspections, and training records"
- "We're integrating with nBrain AI Brain platform"

Step 3: Obtain API Credentials
KPA will provide you with:
- API endpoint URL
- API key or OAuth credentials
- Documentation link

Step 4: Verify Permissions
Confirm with KPA that the API key has read-only access to all safety modules you use.

What to Upload:
- API endpoint URL
- API key or OAuth credentials
- Any documentation KPA provides

💡 Alternative: KPA may prefer to work directly with our technical team. You can introduce them via email.`
      },
      {
        name: 'Monday.com',
        description: 'Project Management, Legal Tracking, Bids',
        instructions: `Step 1: Log into Monday.com
Go to monday.com and sign in with admin credentials.

Step 2: Navigate to Developer Settings
Click your profile picture → Admin → Integrations & API
Direct link: https://auth.monday.com/developers

Step 3: Generate Personal API Token
Scroll to "Personal API Tokens"
Click "Generate" or "+ New Token"
Name it: nBrain AI Integration

Step 4: Copy the Token
Monday.com will display your API token. Copy it immediately.
⚠️ Important: This token grants access to all boards the user can see. Ensure the admin generating this has appropriate permissions.

Step 5: Note Your Workspace
Make note of which Monday.com workspace(s) contain the data we need to access (bids, legal matters, etc.)

What to Upload:
- Personal API Token
- List of workspace/board names we should access
- Monday.com account email`
      },
      {
        name: 'Microsoft 365 / Outlook',
        description: 'Email, Calendar, OneDrive, Teams',
        instructions: `Step 1: Access Microsoft Admin Center
Go to admin.microsoft.com and sign in with global admin credentials.

Step 2: Register an App
Navigate to: Azure Active Directory → App Registrations → New Registration
Direct link: https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps
Fill in:
- Name: nBrain AI Integration
- Supported account types: Accounts in this organizational directory only
- Redirect URI: Leave blank for now

Step 3: Generate Client Secret
In your new app registration:
Go to Certificates & secrets → New client secret
Description: nBrain Integration Secret
Expiration: 24 months
Copy the secret value immediately!

Step 4: Note Application Details
From the app's Overview page, copy:
- Application (client) ID
- Directory (tenant) ID

Step 5: Set API Permissions
Go to API permissions → Add a permission → Microsoft Graph
Add these Application permissions (read-only):
- Mail.Read (read emails)
- Calendars.Read (read calendars)
- Files.Read.All (read OneDrive/SharePoint)
- User.Read.All (read user info)
Click "Grant admin consent for [your organization]"

What to Upload:
- Application (client) ID
- Directory (tenant) ID
- Client secret value
- Confirmation that admin consent was granted

💡 Complex Setup? This one is more technical. If you need assistance, we can schedule a 15-minute screen share to walk through it together.`
      },
      {
        name: 'Ramp',
        description: 'Credit Card Management, Expense Tracking',
        instructions: `Step 1: Log into Ramp
Go to app.ramp.com and sign in with admin credentials.

Step 2: Navigate to Developer Settings
Click Settings (gear icon) → Developer
Direct link: https://app.ramp.com/settings/developer

Step 3: Create API Key
Click "Create new key"
Name: nBrain AI Integration - Read Only
Permissions: Read-only (uncheck any write permissions)

Step 4: Copy the Key
Ramp will show your API key once. Copy it and save securely.

What to Upload:
- Ramp API Key
- Ramp company/organization name`
      },
      {
        name: 'Box',
        description: 'Document Storage, Document Signing',
        instructions: `Step 1: Log into Box Admin Console
Go to app.box.com/master/settings and sign in with admin account.

Step 2: Navigate to Apps
Click Admin Console → Apps → Custom Apps
Direct link: https://app.box.com/master/custom-apps

Step 3: Create New Custom App
Click "+ Add App" → "Create a Custom App"
Choose "Server Authentication (with JWT)" or "OAuth 2.0"
App Name: nBrain AI Integration

Step 4: Configure Permissions
Under Configuration:
- Application Scopes: Read all files and folders
- Do NOT enable write/delete permissions

Step 5: Generate & Download Credentials
Click "Generate a Public/Private Keypair"
A JSON file will download automatically - save this securely!
Also copy the Client ID and Client Secret

Step 6: Authorize the App
Go back to Admin Console → Apps
Find your new app and click "Authorize"

What to Upload:
- Downloaded JSON configuration file (send securely!)
- Client ID
- Client Secret`
      },
      {
        name: 'Zoom',
        description: 'Meeting Recordings & Transcripts',
        instructions: `Step 1: Access Zoom App Marketplace
Go to marketplace.zoom.us and sign in with admin credentials.

Step 2: Create Server-to-Server OAuth App
Click "Develop" → "Build App"
Choose "Server-to-Server OAuth"
App Name: nBrain AI Integration

Step 3: Configure App Information
Fill in basic information (company name, developer contact, etc.)

Step 4: Add Scopes
Under Scopes, add these permissions:
- meeting:read:admin
- recording:read:admin
- user:read:admin

Step 5: Get Credentials
Navigate to Credentials tab and copy:
- Account ID
- Client ID
- Client Secret

Step 6: Activate the App
Click "Continue" and then "Activate"

What to Upload:
- Account ID
- Client ID
- Client Secret`
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
    const { credential_id, name, company_name, email, appointment_date, appointment_time } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!appointment_date) {
      return res.status(400).json({ error: 'Appointment date is required' });
    }
    if (!appointment_time) {
      return res.status(400).json({ error: 'Appointment time is required' });
    }
    
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
      `INSERT INTO appointments (credential_id, name, company_name, email, appointment_date, appointment_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
       RETURNING *`,
      [credential_id, name.trim(), company_name.trim(), email.trim(), appointment_date, appointment_time]
    );
    
    res.json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: error.message || 'Failed to book appointment' });
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

// Admin report endpoint - view all submissions and appointments
app.get('/api/admin-report', async (req, res) => {
  const client = await pool.connect();
  try {
    // Get all credentials with their status
    const credentials = await client.query(`
      SELECT id, name, description, status, 
             CASE 
               WHEN credential_data IS NOT NULL THEN LEFT(credential_data, 100) || '...'
               ELSE NULL 
             END as credential_preview,
             file_path, file_type, updated_at
      FROM credentials 
      ORDER BY 
        CASE status 
          WHEN 'completed' THEN 1 
          WHEN 'needed' THEN 2 
        END,
        name
    `);
    
    // Get all appointments with contact info
    const appointments = await client.query(`
      SELECT a.id, a.name, a.company_name, a.email, 
             a.appointment_date, a.appointment_time, a.status,
             c.name as credential_name, a.created_at
      FROM appointments a
      LEFT JOIN credentials c ON a.credential_id = c.id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `);
    
    // Count statistics
    const stats = {
      total_credentials: credentials.rows.length,
      completed_credentials: credentials.rows.filter(c => c.status === 'completed').length,
      needed_credentials: credentials.rows.filter(c => c.status === 'needed').length,
      total_appointments: appointments.rows.length,
      upcoming_appointments: appointments.rows.filter(a => new Date(a.appointment_date) >= new Date()).length
    };
    
    // Generate HTML report
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>IPS Credential Portal - Admin Report</title>
        <style>
          :root {
            --color-primary: #1a365d;
            --color-success: #059669;
            --color-warning: #d69e2e;
            --color-needed: #dc2626;
            --color-bg: #F3F4F6;
            --color-surface: #FFFFFF;
            --color-border: #D1D5DB;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--color-bg);
            padding: 2rem;
            line-height: 1.6;
          }
          .header {
            background: linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            text-align: center;
          }
          .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
          .header p { opacity: 0.9; }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
          }
          .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid var(--color-primary);
          }
          .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--color-primary);
            margin-bottom: 0.25rem;
          }
          .stat-label {
            color: #6b7280;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .section {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .section h2 {
            color: var(--color-primary);
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
            border-bottom: 2px solid var(--color-border);
            padding-bottom: 0.5rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
          }
          th {
            background: var(--color-primary);
            color: white;
            padding: 0.75rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.9rem;
          }
          td {
            padding: 0.75rem;
            border-bottom: 1px solid var(--color-border);
            font-size: 0.9rem;
          }
          tr:hover { background: #f9fafb; }
          .badge {
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
          }
          .badge.completed {
            background: #d1fae5;
            color: var(--color-success);
          }
          .badge.needed {
            background: #fee2e2;
            color: var(--color-needed);
          }
          .badge.scheduled {
            background: #dbeafe;
            color: #2563eb;
          }
          .no-data {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
            font-style: italic;
          }
          .credential-preview {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-family: monospace;
            font-size: 0.85rem;
            color: #6b7280;
          }
          .back-link {
            display: inline-block;
            margin-top: 2rem;
            padding: 0.75rem 1.5rem;
            background: var(--color-primary);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
          }
          .back-link:hover {
            background: #2563eb;
          }
          .timestamp {
            color: #6b7280;
            font-size: 0.85rem;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 IPS Credential Portal - Admin Report</h1>
          <p>Generated: ${new Date().toLocaleString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${stats.total_credentials}</div>
            <div class="stat-label">Total Credentials</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.completed_credentials}</div>
            <div class="stat-label">Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.needed_credentials}</div>
            <div class="stat-label">Still Needed</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.total_appointments}</div>
            <div class="stat-label">Total Appointments</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.upcoming_appointments}</div>
            <div class="stat-label">Upcoming</div>
          </div>
        </div>

        <div class="section">
          <h2>💰 QuickBooks Access (Received Offline)</h2>
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>QuickBooks Company ID</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Tea It Up Operating, LLC</strong></td>
                <td><code style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px;">9130 3550 7031 9306</code></td>
                <td><span class="badge completed">Completed</span></td>
                <td><span style="color: #6b7280;">Received Offline</span></td>
              </tr>
              <tr>
                <td><strong>Tea It Up El Paso</strong></td>
                <td><code style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px;">9130 3526 4194 7426</code></td>
                <td><span class="badge completed">Completed</span></td>
                <td><span style="color: #6b7280;">Received Offline</span></td>
              </tr>
              <tr>
                <td><strong>Ingram Properties</strong></td>
                <td><code style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px;">9341 4531 5774 5001</code></td>
                <td><span class="badge completed">Completed</span></td>
                <td><span style="color: #6b7280;">Received Offline</span></td>
              </tr>
              <tr>
                <td><strong>Patriot Strategy and Development, LLC</strong></td>
                <td><code style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px;">9341 4552 4997 6050</code></td>
                <td><span class="badge completed">Completed</span></td>
                <td><span style="color: #6b7280;">Received Offline</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>📋 Credentials Status</h2>
          ${credentials.rows.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Credential Name</th>
                  <th>Status</th>
                  <th>Data Preview</th>
                  <th>File</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                ${credentials.rows.map(c => `
                  <tr>
                    <td><strong>${c.name}</strong><br><small style="color: #6b7280;">${c.description || ''}</small></td>
                    <td><span class="badge ${c.status}">${c.status}</span></td>
                    <td><div class="credential-preview">${c.credential_preview || '-'}</div></td>
                    <td>${c.file_path ? `<span style="color: var(--color-success);">✓ ${c.file_type}</span>` : '-'}</td>
                    <td class="timestamp">${c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="no-data">No credentials found</div>'}
        </div>

        <div class="section">
          <h2>📅 Appointments Booked</h2>
          ${appointments.rows.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Credential</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${appointments.rows.map(a => `
                  <tr>
                    <td><strong>${a.name || 'N/A'}</strong></td>
                    <td>${a.company_name || 'N/A'}</td>
                    <td><a href="mailto:${a.email || ''}">${a.email || 'N/A'}</a></td>
                    <td>${a.credential_name || 'Unknown'}</td>
                    <td>
                      ${a.appointment_date ? new Date(a.appointment_date).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'N/A'}
                      <br>
                      <span style="color: #6b7280;">${a.appointment_time || 'N/A'} PST</span>
                    </td>
                    <td><span class="badge ${a.status}">${a.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="no-data">No appointments booked yet</div>'}
        </div>

        <a href="/" class="back-link">← Back to Portal</a>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; background: #fee2e2;">
          <h1 style="color: #dc2626;">Error Generating Report</h1>
          <p>Error: ${error.message}</p>
          <a href="/">← Back to Portal</a>
        </body>
      </html>
    `);
  } finally {
    client.release();
  }
});

// Manual cleanup endpoint - visit this URL in browser to remove old credentials
app.get('/api/cleanup-old-credentials', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      DELETE FROM credentials 
      WHERE name IN (
        'Render Account Setup', 
        'Pinecone Account Setup', 
        'Database Access Credentials', 
        'AWS S3 Credentials', 
        'Email Service Configuration'
      )
      RETURNING id, name
    `);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cleanup Complete</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: #f3f4f6; }
          .success { background: #d1fae5; border: 2px solid #059669; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
          h1 { color: #059669; }
          ul { margin: 10px 0; }
          a { color: #1a365d; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✓ Old Credentials Removed!</h1>
          <p><strong>${result.rows.length}</strong> old credentials have been deleted from the database.</p>
          ${result.rows.length > 0 ? `
            <p>Removed:</p>
            <ul>
              ${result.rows.map(r => `<li>${r.name}</li>`).join('')}
            </ul>
          ` : '<p>No old credentials found (already cleaned up).</p>'}
          <p><a href="/">← Return to Credential Portal</a></p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error cleaning up credentials:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cleanup Error</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: #f3f4f6; }
          .error { background: #fee2e2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
          h1 { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>✗ Cleanup Failed</h1>
          <p>Error: ${error.message}</p>
          <p><a href="/">← Return to Credential Portal</a></p>
        </div>
      </body>
      </html>
    `);
  } finally {
    client.release();
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cleanup old credentials that should no longer appear
async function cleanupOldCredentials() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      DELETE FROM credentials 
      WHERE name IN (
        'Render Account Setup', 
        'Pinecone Account Setup', 
        'Database Access Credentials', 
        'AWS S3 Credentials', 
        'Email Service Configuration'
      )
      RETURNING id, name
    `);
    
    if (result.rows.length > 0) {
      console.log(`Cleaned up ${result.rows.length} old credentials:`, result.rows.map(r => r.name));
    } else {
      console.log('No old credentials to clean up');
    }
  } catch (error) {
    console.error('Error cleaning up old credentials:', error);
  } finally {
    client.release();
  }
}

// Initialize and start server
async function startServer() {
  try {
    await initializeDatabase();
    await cleanupOldCredentials(); // Run cleanup before seeding
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

