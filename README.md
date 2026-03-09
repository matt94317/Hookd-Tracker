# Hookd-Tracker

This is a Content Creator Campaign Management platform. It could track, analyze real time content statists, manage campaign, content creations and search, match with different available campaigns.

## Docker Commands

### Start / Stop

```bash
# Build images + create containers + start containers
docker-compose up --build

# Build images + create containers + start containers (detached / background)
docker-compose up --build -d

# Stop containers + remove containers (volumes persist, DB data kept)
docker-compose down

# Stop containers + remove containers + remove volumes (DB data deleted)
docker-compose down -v
```

### View Logs

```bash
# Stream logs from all containers
docker-compose logs -f

# Stream logs from a specific container
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Access Containers

```bash
# Open a shell inside the backend container
docker-compose exec backend bash

# Open a shell inside the frontend container
docker-compose exec frontend bash

# Connect to PostgreSQL inside the db container
docker-compose exec db psql -U hookd -d hookd_tracker
```

### Database Migrations

```bash
# Run migrations inside the backend container
docker-compose exec backend flask db upgrade

# Generate a new migration file inside the backend container
docker-compose exec backend flask db migrate -m "description"

# Show migration history inside the backend container
docker-compose exec backend flask db history
```

### Rebuild Images

```bash
# Rebuild image for a specific service
docker-compose build backend
docker-compose build frontend

# Rebuild all images from scratch (no cache)
docker-compose build --no-cache
```

### Ports

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5000 |
| Database | localhost:5432        |
