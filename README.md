# Ingram Businesses - Credential Setup Portal

A dynamic web application for managing credential setup and onboarding for the Ingram Businesses AI platform.

## Features

- **Dynamic Credential Cards**: Expandable/collapsible cards showing setup instructions
- **Status Tracking**: Visual indicators for "Needed" vs "Completed" credentials
- **Flexible Upload**: Support for text input or file uploads (PDF, TXT, images)
- **Calendar Booking**: Schedule support calls with automatic availability checking
- **PostgreSQL Database**: Persistent storage for credentials and appointments
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: Vanilla JavaScript (no framework dependencies)
- **Deployment**: Render (static frontend + backend + database)

## Local Development

### Prerequisites

- Node.js 18+ 
- PostgreSQL database

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure your `.env` file with database credentials:
```
DATABASE_URL=postgresql://user:password@localhost:5432/ingram_credentials
PORT=3000
NODE_ENV=development
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

5. Open your browser to `http://localhost:3000`

## Database Schema

### Credentials Table
- `id`: Serial primary key
- `name`: Credential name (unique)
- `description`: Brief description
- `instructions`: Setup instructions
- `status`: 'needed' or 'completed'
- `credential_data`: Uploaded text or file reference
- `file_path`: Path to uploaded file
- `file_type`: MIME type of uploaded file
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Appointments Table
- `id`: Serial primary key
- `credential_id`: Foreign key to credentials
- `appointment_date`: Date of appointment
- `appointment_time`: Time of appointment
- `status`: 'scheduled', 'completed', 'cancelled'
- `created_at`: Timestamp

## Deployment to Render

### Option 1: Using render.yaml (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repo to Render
3. Render will automatically detect `render.yaml` and create:
   - Web service
   - PostgreSQL database
   - Environment variables

### Option 2: Manual Setup

1. Create a new PostgreSQL database on Render
2. Create a new Web Service on Render
3. Set environment variables:
   - `DATABASE_URL`: (auto-populated from database)
   - `NODE_ENV`: production
   - `PORT`: 10000
   - `UPLOAD_DIR`: ./uploads
   - `MAX_FILE_SIZE`: 10485760

4. Set build command: `npm install`
5. Set start command: `npm start`

### Post-Deployment

The application will automatically:
- Create database tables on first run
- Seed initial credentials
- Be accessible at your Render URL

## API Endpoints

### Credentials
- `GET /api/credentials` - Get all credentials
- `GET /api/credentials/:id` - Get single credential
- `POST /api/credentials/:id/upload` - Upload credential (multipart/form-data)

### Appointments
- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/available?date=YYYY-MM-DD` - Get available time slots
- `POST /api/appointments` - Book an appointment

### Health Check
- `GET /health` - Server health check

## File Upload

Supported file types:
- PDF (`.pdf`)
- Text (`.txt`)
- Images (`.jpg`, `.jpeg`, `.png`)

Maximum file size: 10MB (configurable via `MAX_FILE_SIZE` env var)

## Calendar Booking

- Available Monday-Friday, 10:00 AM - 4:00 PM PST
- 30-minute time slots
- Bookings start from next day (no same-day bookings)
- Automatic conflict detection

## Security Considerations

- File uploads are validated by MIME type
- File size limits enforced
- SQL injection protection via parameterized queries
- CORS enabled for API access
- Environment variables for sensitive data

## Accessing Uploaded Credentials

Uploaded credentials are stored in:
- **Text submissions**: `credentials.credential_data` column
- **File uploads**: `uploads/` directory, path in `credentials.file_path` column

To retrieve credentials for `.env` files:
1. Access the database directly via Render shell
2. Query: `SELECT name, credential_data, file_path FROM credentials WHERE status = 'completed';`
3. For files, download from the `uploads/` directory

## Support

For issues or questions, contact: danny@nbrain.ai

## License

Proprietary - Ingram Businesses

