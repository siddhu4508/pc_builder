# PC Builder Application

A full-stack application for building and managing PC configurations.

## Project Structure

```
pc_builder/
├── backend/                 # Django backend
│   ├── pc_builder/         # Main Django project
│   ├── users/             # User management app
│   ├── builds/            # PC builds app
│   └── social/            # Social features app
└── frontend/              # React frontend
    ├── src/              # Source code
    ├── public/           # Static files
    └── package.json      # Dependencies
```

## Features

- User Authentication & Profiles
- PC Build Creation & Sharing
- Social Features (Like, Comment, Share, Feed)
- Real-time Component Price Updates
- Mobile-first, minimalist design
- Dark Mode Support

## Tech Stack

- Backend: Django + Django REST Framework
- Frontend: React.js + Tailwind CSS
- Database: PostgreSQL
- Media Storage: Firebase
- Caching: Redis
- Authentication: JWT

## Prerequisites

- Python 3.11+
- Node.js 18+ (LTS)
- PostgreSQL
- Redis
- Firebase Account

## Setup Instructions

### Backend Setup

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
Create a `.env` file in the backend directory with:
```
DEBUG=True
SECRET_KEY=your-secret-key
DB_NAME=pc_builder
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```

4. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create superuser:
```bash
python manage.py createsuperuser
```

6. Run development server:
```bash
python manage.py runserver
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

## Common Issues and Solutions

### Database Connection Issues

1. Check PostgreSQL service is running:
```bash
# Windows
Get-Service postgresql*

# Linux
sudo systemctl status postgresql
```

2. Verify database credentials in `.env` file
3. Ensure database exists:
```sql
CREATE DATABASE pc_builder;
```

### Frontend Issues

1. Node modules not found:
```bash
cd frontend
rm -rf node_modules
npm install
```

2. Port conflicts:
- Change port in `vite.config.ts`
- Kill process using the port:
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### API Issues

1. CORS errors:
- Check `CORS_ALLOWED_ORIGINS` in settings.py
- Verify frontend URL is in allowed origins

2. Authentication issues:
- Check JWT token in localStorage
- Verify token expiration
- Check user permissions

## Development Workflow

1. Start both servers:
```bash
# Terminal 1 (Backend)
python manage.py runserver

# Terminal 2 (Frontend)
cd frontend
npm run dev
```

2. Access endpoints:
- Backend API: http://localhost:8000/api/
- Admin interface: http://localhost:8000/admin/
- Frontend: http://localhost:5173/

## Testing

1. Run backend tests:
```bash
python manage.py test
```

2. Run frontend tests:
```bash
cd frontend
npm test
```

## Deployment

1. Build frontend:
```bash
cd frontend
npm run build
```

2. Collect static files:
```bash
python manage.py collectstatic
```

3. Set production settings:
- Update `DEBUG=False`
- Configure proper database credentials
- Set up proper CORS settings
- Configure static files serving

## Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Submit pull request

## License

MIT License 