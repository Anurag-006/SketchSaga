# 🎨 SketchSaga

A highly performant, real-time collaborative whiteboard application engineered for horizontal scalability. SketchSaga allows multiple users to draw and collaborate simultaneously with sub-40ms sync latency.

Built with a microservices architecture using **Next.js**, **Node.js WebSockets**, **Redis Pub/Sub**, and **PostgreSQL**, orchestrated within a **Turborepo** monorepo.

## ✨ System Architecture

SketchSaga completely decouples short-lived HTTP requests from long-lived WebSocket connections, allowing independent scaling of services. 

* **HTTP Backend:** Handles standard REST API traffic, JWT authentication, and room generation.
* **WebSocket Backend:** A dedicated real-time server handling high-throughput drawing and chat events.
* **Redis Pub/Sub & Lists:** Acts as the central nervous system. Ephemeral room state is stored purely in Redis Lists for blazing-fast read/writes, while Pub/Sub handles $O(N)$ event fan-out across multiple WebSocket server instances.
* **Database:** PostgreSQL stores persistent room data, optimized with B-Tree indexing for $O(\log N)$ query lookups.

## 🚀 Key Performance Optimizations

* **Double-Buffered Rendering:** Implemented an off-screen canvas rendering engine. By baking finalized shapes onto a hidden canvas and stamping them in an $O(1)$ operation, the main thread maintains a buttery-smooth 60FPS even with thousands of shapes on screen.
* **Stateless Ephemeral Rooms:** Guest rooms operate entirely in-memory via Redis with a 1-hour TTL. This bypasses the PostgreSQL database entirely for temporary sessions, massively reducing disk I/O.
* **Global Undo/Redo Engine:** A customized client-side state machine tracks user-specific actions, allowing users to reliably undo their specific strokes in a highly concurrent multiplayer environment.
* **Cloud-Ready Observability:** Fully containerized with Docker, featuring `pino` structured JSON logging and dedicated HTTP health-check endpoints for seamless AWS Application Load Balancer (ALB) integration.

## 📦 Project Structure

This project uses [Turborepo](https://turbo.build/) to manage the monorepo structure.

```text
apps/
  ├─ web/             # Next.js frontend (Canvas engine, UI)
  ├─ http-backend/    # Express REST API (Auth, DB orchestration)
  └─ ws-backend/      # Native WebSocket server (Real-time sync)
packages/
  ├─ database/        # Shared Prisma ORM and schema
  ├─ common/          # Shared Zod schemas and types
  └─ backend-common/  # Shared backend utilities
```

## 🛠️ Local Development Setup

Ensure you have **Docker** and **pnpm** installed on your machine.

### 1. Start the Backing Services

Spin up the local PostgreSQL database and Redis cache:

```bash
docker compose up -d
```

### 2. Install Dependencies & Generate Prisma Client

```bash
pnpm install
pnpm --filter database db:push
```

### 3. Start the Development Servers

Launch the frontend, HTTP backend, and WebSocket server simultaneously:

```bash
pnpm dev
```

The application will be available at:

```
http://localhost:3000
```

---

## 🔒 Environment Variables

Create a `.env` file in the root directory (shared across the workspace):

```env
DATABASE_URL="postgresql://turbo:turbo@localhost:5432/turbodb?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_secure_secret_here"
HTTP_BACKEND="http://localhost:4001"
FRONTEND_URL="http://localhost:3000"
```