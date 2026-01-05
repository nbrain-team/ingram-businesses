# System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│                    (Web Browser)                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  index.html  │  │  styles.css  │  │   app.js     │     │
│  │  (Structure) │  │  (Styling)   │  │  (Logic)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    RENDER WEB SERVICE                        │
│                      (Node.js + Express)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    server.js                          │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │  │
│  │  │   API Routes │  │ File Upload  │  │  Static   │  │  │
│  │  │   /api/*     │  │   (Multer)   │  │  Files    │  │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ SQL
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  RENDER POSTGRESQL DATABASE                  │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   credentials    │         │   appointments   │         │
│  │                  │         │                  │         │
│  │  - id            │         │  - id            │         │
│  │  - name          │         │  - credential_id │         │
│  │  - description   │         │  - date          │         │
│  │  - instructions  │         │  - time          │         │
│  │  - status        │         │  - status        │         │
│  │  - credential_   │         │  - created_at    │         │
│  │    data          │         └──────────────────┘         │
│  │  - file_path     │                                       │
│  │  - file_type     │                                       │
│  │  - created_at    │                                       │
│  │  - updated_at    │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### Credential Upload Flow

```
User                Frontend              Backend              Database
 │                     │                     │                     │
 │  1. Click Upload    │                     │                     │
 │────────────────────>│                     │                     │
 │                     │                     │                     │
 │  2. Enter text/     │                     │                     │
 │     Upload file     │                     │                     │
 │────────────────────>│                     │                     │
 │                     │                     │                     │
 │                     │  3. POST /api/      │                     │
 │                     │     credentials/    │                     │
 │                     │     :id/upload      │                     │
 │                     │────────────────────>│                     │
 │                     │                     │                     │
 │                     │                     │  4. Validate file   │
 │                     │                     │     (type, size)    │
 │                     │                     │                     │
 │                     │                     │  5. Save file to    │
 │                     │                     │     uploads/        │
 │                     │                     │                     │
 │                     │                     │  6. UPDATE          │
 │                     │                     │     credentials     │
 │                     │                     │     SET status=     │
 │                     │                     │     'completed'     │
 │                     │                     │────────────────────>│
 │                     │                     │                     │
 │                     │                     │  7. Return updated  │
 │                     │                     │     credential      │
 │                     │                     │<────────────────────│
 │                     │                     │                     │
 │                     │  8. Success response│                     │
 │                     │<────────────────────│                     │
 │                     │                     │                     │
 │  9. Show success    │                     │                     │
 │     Update UI       │                     │                     │
 │<────────────────────│                     │                     │
```

### Calendar Booking Flow

```
User                Frontend              Backend              Database
 │                     │                     │                     │
 │  1. Click Book Call │                     │                     │
 │────────────────────>│                     │                     │
 │                     │                     │                     │
 │  2. Select date     │                     │                     │
 │────────────────────>│                     │                     │
 │                     │                     │                     │
 │                     │  3. GET /api/       │                     │
 │                     │     appointments/   │                     │
 │                     │     available?date= │                     │
 │                     │────────────────────>│                     │
 │                     │                     │                     │
 │                     │                     │  4. SELECT booked   │
 │                     │                     │     times for date  │
 │                     │                     │────────────────────>│
 │                     │                     │                     │
 │                     │                     │  5. Return booked   │
 │                     │                     │     times           │
 │                     │                     │<────────────────────│
 │                     │                     │                     │
 │                     │                     │  6. Calculate       │
 │                     │                     │     available slots │
 │                     │                     │     (10am-4pm)      │
 │                     │                     │                     │
 │                     │  7. Return available│                     │
 │                     │     time slots      │                     │
 │                     │<────────────────────│                     │
 │                     │                     │                     │
 │  8. Display slots   │                     │                     │
 │<────────────────────│                     │                     │
 │                     │                     │                     │
 │  9. Select time     │                     │                     │
 │────────────────────>│                     │                     │
 │                     │                     │                     │
 │  10. Click Book     │                     │                     │
 │────────────────────>│                     │                     │
 │                     │                     │                     │
 │                     │  11. POST /api/     │                     │
 │                     │      appointments   │                     │
 │                     │────────────────────>│                     │
 │                     │                     │                     │
 │                     │                     │  12. Check slot     │
 │                     │                     │      still available│
 │                     │                     │────────────────────>│
 │                     │                     │                     │
 │                     │                     │  13. INSERT         │
 │                     │                     │      appointment    │
 │                     │                     │────────────────────>│
 │                     │                     │                     │
 │                     │                     │  14. Return new     │
 │                     │                     │      appointment    │
 │                     │                     │<────────────────────│
 │                     │                     │                     │
 │                     │  15. Success        │                     │
 │                     │<────────────────────│                     │
 │                     │                     │                     │
 │  16. Show           │                     │                     │
 │      confirmation   │                     │                     │
 │<────────────────────│                     │                     │
```

## 📦 Component Breakdown

### Frontend Components

```
public/
├── index.html
│   ├── Header (static)
│   ├── Summary Section (static)
│   ├── Credentials Container (dynamic)
│   │   └── Credential Cards (generated by JS)
│   ├── Upload Modal (hidden by default)
│   └── Calendar Modal (hidden by default)
│
├── styles.css
│   ├── Global styles
│   ├── Card styles
│   ├── Modal styles
│   ├── Calendar styles
│   └── Responsive breakpoints
│
└── app.js
    ├── State management
    ├── API calls
    ├── DOM manipulation
    ├── Event handlers
    └── Utility functions
```

### Backend Components

```
server.js
├── Configuration
│   ├── Database connection (pg Pool)
│   ├── Middleware (CORS, body-parser)
│   └── File upload (Multer)
│
├── Database Initialization
│   ├── Create tables
│   └── Seed credentials
│
├── API Routes
│   ├── GET  /api/credentials
│   ├── GET  /api/credentials/:id
│   ├── POST /api/credentials/:id/upload
│   ├── GET  /api/appointments
│   ├── GET  /api/appointments/available
│   └── POST /api/appointments
│
├── Static File Serving
│   └── Serve public/ directory
│
└── Server Startup
    └── Initialize DB → Start Express
```

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: HTTPS (Render)                                    │
│  ├── SSL/TLS encryption                                     │
│  └── Automatic certificate renewal                          │
│                                                              │
│  Layer 2: Input Validation                                  │
│  ├── File type checking (MIME types)                        │
│  ├── File size limits (10MB)                                │
│  └── SQL injection prevention (parameterized queries)       │
│                                                              │
│  Layer 3: Database Security                                 │
│  ├── Connection string in env vars                          │
│  ├── SSL connection to database                             │
│  └── Limited user permissions                               │
│                                                              │
│  Layer 4: File System                                       │
│  ├── Uploads stored outside public directory                │
│  ├── Unique filenames (timestamp + random)                  │
│  └── .gitignore prevents committing uploads                 │
│                                                              │
│  Layer 5: CORS                                              │
│  └── Configured for same-origin by default                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

```sql
-- Credentials Table
CREATE TABLE credentials (
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
);

-- Appointments Table
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    credential_id INTEGER REFERENCES credentials(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX idx_appointments_date 
ON appointments(appointment_date, appointment_time);
```

### Relationships

```
credentials (1) ──────< (many) appointments
     │                        │
     │                        │
   One credential      Many appointments
   can have            can be booked for
   multiple            the same credential
   appointments
```

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         GITHUB                               │
│                    (Source Control)                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Repository: ingram-credential-portal                │  │
│  │  Branch: main                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Git Push
                            │ (Auto-deploy trigger)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         RENDER                               │
│                    (Cloud Platform)                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Blueprint: render.yaml                              │  │
│  │  ├── Detects configuration                           │  │
│  │  ├── Creates resources                               │  │
│  │  └── Manages deployments                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Web Service: ingram-credential-portal               │  │
│  │  ├── Build: npm install                              │  │
│  │  ├── Start: npm start                                │  │
│  │  ├── Health: /health endpoint                        │  │
│  │  └── URL: https://[app-name].onrender.com            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database: ingram-credentials-db          │  │
│  │  ├── Plan: Starter                                   │  │
│  │  ├── Storage: 1GB                                    │  │
│  │  ├── Backups: Daily automatic                        │  │
│  │  └── SSL: Enabled                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Request/Response Flow

### Example: Upload Credential

```
1. User fills form
   ├── Text: "API_KEY=abc123xyz"
   └── OR File: credentials.pdf

2. Frontend (app.js)
   ├── Creates FormData
   ├── Adds text or file
   └── Sends POST to /api/credentials/1/upload

3. Backend (server.js)
   ├── Multer middleware processes upload
   ├── Validates file type/size
   ├── Saves file to uploads/
   └── Updates database

4. Database (PostgreSQL)
   ├── UPDATE credentials
   ├── SET status = 'completed'
   ├── SET credential_data = '...'
   └── SET updated_at = NOW()

5. Backend Response
   └── JSON: { success: true, credential: {...} }

6. Frontend Updates
   ├── Shows success message
   ├── Changes badge to "COMPLETED"
   └── Updates card styling
```

## 📈 Scaling Considerations

### Current Setup (Starter Plan)
- **Handles**: ~100 concurrent users
- **Storage**: 1GB database + file uploads
- **Requests**: ~100 req/sec

### Scale-Up Path

```
Starter Plan ($14/mo)
    │
    ├── More users? → Standard Plan ($50/mo)
    │   └── 2x resources, 4x concurrent users
    │
    ├── More storage? → Upgrade database
    │   └── 10GB, 100GB, or custom
    │
    ├── Global users? → Add CDN
    │   └── Cloudflare or Render CDN
    │
    └── Heavy files? → Move to S3
        └── Unlimited storage, faster delivery
```

## 🎯 Performance Optimizations

### Already Implemented
✅ Database indexes on frequently queried columns
✅ Minimal frontend dependencies (vanilla JS)
✅ Efficient SQL queries (no N+1 problems)
✅ Static file caching
✅ Connection pooling (pg Pool)

### Future Optimizations
- Redis caching for credentials
- Image compression for uploads
- Lazy loading for large lists
- WebSocket for real-time updates
- CDN for static assets

## 🔍 Monitoring Points

```
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING DASHBOARD                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Application Metrics (Render)                               │
│  ├── Response times                                         │
│  ├── Error rates                                            │
│  ├── Request volume                                         │
│  └── Memory/CPU usage                                       │
│                                                              │
│  Database Metrics (Render)                                  │
│  ├── Connection count                                       │
│  ├── Query performance                                      │
│  ├── Storage usage                                          │
│  └── Backup status                                          │
│                                                              │
│  Business Metrics (Custom)                                  │
│  ├── Credentials uploaded                                   │
│  ├── Appointments booked                                    │
│  ├── Completion rate                                        │
│  └── Average time to complete                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Development Workflow

```
Local Development
    │
    ├── 1. Make changes
    │   └── Edit server.js, public/*, etc.
    │
    ├── 2. Test locally
    │   └── npm start → http://localhost:3000
    │
    ├── 3. Commit changes
    │   └── git commit -m "Description"
    │
    └── 4. Push to GitHub
        └── git push origin main
            │
            └──> Triggers Render auto-deploy
                 │
                 ├── Build (npm install)
                 ├── Deploy (npm start)
                 └── Live in ~2 minutes
```

---

This architecture is designed for:
- **Simplicity**: Easy to understand and maintain
- **Scalability**: Can grow with your needs
- **Reliability**: Managed services, automatic backups
- **Security**: Multiple layers of protection
- **Performance**: Fast response times, efficient queries

Questions about the architecture? See README.md or contact danny@nbrain.ai

