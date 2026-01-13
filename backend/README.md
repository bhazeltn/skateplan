# SkatePlan Backend

FastAPI backend for SkatePlan figure skating coaching platform.

## Setup

### Install Dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_URL`: Supabase instance URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `JWT_SECRET`: Supabase JWT secret for token verification

## Database Migrations (Alembic)

This project uses Alembic for database schema version control.

### Initial Setup

Alembic is already initialized in the `alembic/` directory.

### Creating a Migration

When you modify models in `app/models/`, create a new migration:

```bash
# From backend directory
alembic revision --autogenerate -m "description of changes"
```

This will generate a new migration file in `alembic/versions/`.

### Applying Migrations

To apply pending migrations to the database:

```bash
alembic upgrade head
```

### Rolling Back

To rollback the last migration:

```bash
alembic downgrade -1
```

To rollback to a specific revision:

```bash
alembic downgrade <revision_id>
```

### Viewing Migration History

```bash
alembic history
alembic current
```

### Running from Docker

If running in Docker, execute Alembic commands inside the container:

```bash
docker exec skateplan-backend alembic upgrade head
```

## Authentication

This backend uses **Supabase Auth (GoTrue)** for authentication:

- Users are stored in `auth.users` (managed by Supabase)
- Profiles are stored in `public.profiles` (synced via database trigger)
- JWT tokens issued by Supabase are verified by the backend
- No custom password hashing - all auth handled by Supabase

### Auth Endpoints

- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/signin` - Sign in with email/password
- `POST /api/v1/auth/signout` - Sign out
- `POST /api/v1/auth/refresh` - Refresh access token

## Running the Server

### Development

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Testing

```bash
pytest
```

Run with coverage:

```bash
pytest --cov=app tests/
```

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py          # Dependencies (auth, DB session)
│   │   ├── main.py          # API router registration
│   │   └── routes/          # API endpoints
│   ├── core/
│   │   ├── config.py        # Settings
│   │   ├── db.py            # Database engine
│   │   ├── security.py      # DEPRECATED (using Supabase Auth)
│   │   ├── supabase.py      # Supabase client
│   │   └── seeds.py         # Data seeding
│   ├── models/              # SQLModel database models
│   └── services/            # Business logic
├── alembic/                 # Database migrations
│   ├── versions/            # Migration scripts
│   └── env.py               # Alembic configuration
├── tests/                   # Test suite
├── requirements.txt
└── README.md
```

## Key Changes from Previous Implementation

### Supabase Auth Migration (2026-01-13)

The backend was migrated from custom JWT authentication to Supabase Auth:

**Removed:**
- Custom `/login/access-token` endpoint
- `hashed_password` field from Profile model
- Custom JWT generation and password hashing

**Added:**
- `/auth/signup`, `/auth/signin`, `/auth/signout` endpoints
- Supabase JWT verification in middleware
- Database trigger for `auth.users` → `profiles` sync
- Supabase Python client integration

This enables:
- Row Level Security (RLS) policies
- OAuth providers (Google, GitHub, etc.)
- Magic link authentication
- Better security alignment with Supabase architecture

## Architecture Decisions

### Why Supabase Auth?

Supabase provides battle-tested authentication that integrates seamlessly with PostgreSQL RLS policies. This allows us to enforce data access rules at the database level, preventing unauthorized access even if application code has bugs.

### Why Alembic?

Alembic provides:
- Version-controlled schema changes
- Rollback capability
- Team collaboration without schema drift
- Safe production deployments

### Why FastAPI?

- Automatic OpenAPI documentation
- Type safety with Pydantic
- High performance (async/await)
- Easy integration with SQLModel
