# CMS Backend API

Node.js/Express backend for CMS Application.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env`

4. Start MongoDB (if running locally)

5. Run the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh token

### Users
- `GET /api/users` - Get all users (protected)
- `GET /api/users/:id` - Get user by ID (protected)
- `PUT /api/users/:id` - Update user (protected)
- `DELETE /api/users/:id` - Delete user (protected)

## Models

- User
- Post
- Category
- Comment
- Exam
- Question
- ExamAttempt
- Notification
- File

## Development

- Server runs on: http://localhost:5000
- Uses MongoDB for database
- JWT for authentication

