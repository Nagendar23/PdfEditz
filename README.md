# PDFEditZ - Full-Stack PDF Management and Editing Application

PDFEdit is a comprehensive full-stack web application that allows users to upload, manage, edit, and merge PDF files. It features secure user authentication, robust file handling, dynamic PDF overlaying (text and images), and merging functionalities.

## 🚀 Features

- **User Authentication**: Secure Sign Up, Login, and Logout functionality using JWT tokens and bcrypt.
- **File Management**: Upload PDFs, DOC, DOCX, and Image files. View and delete files.
- **PDF Viewing**: Built-in PDF viewer for users to preview their uploaded documents.
- **PDF Editing (Overlays)**: Add text and image overlays to specific PDF pages with customizable rotation and opacity.
- **PDF Merging**: Select multiple PDF files and merge them into a single continuous document.
- **Automated Cleanup**: A scheduled cron job runs daily to clean up expired files, freeing up storage.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4
- **PDF Rendering**: `react-pdf`
- **Language**: TypeScript

### Backend
- **Environment**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose)
- **Authentication**: JWT (JSON Web Tokens) & `bcrypt` for hashing
- **File Uploads**: `multer`
- **PDF Manipulation**: `pdf-lib`
- **Image Processing**: `sharp`
- **Task Scheduling**: `node-cron`

## 📁 Project Structure

```text
pdfEdit/
├── backend/
│   ├── config/          # Database configuration (MongoDB)
│   ├── controllers/     # Route logic (authController, fileController)
│   ├── middleware/      # Custom middlewares (e.g., authMiddleware, upload)
│   ├── models/          # Mongoose schemas (User, File)
│   ├── routes/          # Express route definitions (authRoute, fileRoute)
│   ├── uploads/         # Directory where user files are stored locally
│   ├── utils/           # Utility functions (pdfService, cleanup job)
│   └── server.js        # Main entry point for the backend server
└── frontend/
    ├── src/
    │   ├── app/         # Next.js App Router pages (Dashboard, Editor, etc.)
    │   ├── components/  # Reusable UI components (PDF viewer, layout elements)
    │   ├── services/    # API calling functions (fileService)
    │   ├── types/       # TypeScript type definitions
    │   └── utils/       # Frontend utility helper functions
    ├── package.json
    └── tailwind.config.js / postcss.config.mjs
```

## ⚙️ Setup and Installation

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB instance (local or MongoDB Atlas)

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=8000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The backend will be running on `http://localhost:8000`.

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file if you have any environment-specific frontend configurations (e.g., API base URL):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be running on `http://localhost:3000`.

## 📜 API Endpoints

### Authentication (`/api/auth`)
- `POST /signup` - Register a new user
- `POST /login` - Authenticate user and issue JWT
- `POST /logout` - Clear user authentication cookies
- `GET /me` - Get current authenticated user details

### File Management (`/api/files`)
- `POST /upload` - Upload a new file (PDF, Doc, Image) using `multer`
- `GET /` - Get all files for the authenticated user
- `DELETE /:id` - Delete a specific file from disk and database
- `GET /preview/:id` - Stream file content for previewing inline
- `POST /overlay/:id` - Apply text/image overlays to a PDF
- `POST /merge` - Merge multiple PDFs into one new document

## 🧹 Automated Cleanup
The backend includes a scheduled `node-cron` job that runs automatically at midnight (`0 0 * * *`). This job finds files in the database where the `expiresAt` field has passed, deletes the physical file from the `uploads/` directory, and removes the document from MongoDB, ensuring efficient storage management.
