# صاحب القران (SahibAlquran)

**SahibAlquran** is an Arabic web app for tracking daily Quran recitation assessments (wird) within study groups. Each learner must record their daily wird — حفظ، مراجعة، تلاوة — with their assigned mate, from Saturday to Thursday. Missing sessions trigger accountability alerts and can auto-deactivate a learner, keeping the group disciplined and progressing.

---

## 🏗️ Structure

```
sahibalquran/
├── apps/
│   ├── backend/          NestJS + Prisma + MySQL
│   └── client/           React 19 + Vite + Tailwind v4 (RTL, Arabic UI)
└── packages/
    └── shared/           Shared DTOs, Zod schemas, and utilities
```

---

## ⚙️ Tech Stack

| Layer       | Tech                                                                |
| ----------- | ------------------------------------------------------------------- |
| Frontend    | React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, React Router v7 |
| Backend     | NestJS 11, Prisma 7, MySQL 8                                        |
| Auth        | JWT (30 days), Argon2 hashing                                       |
| Validation  | Zod (shared factory schemas)                                        |
| State/Query | TanStack Query v5, Zustand                                          |
| Forms       | React Hook Form                                                     |
| Logging     | Winston + daily-rotate-file                                         |
| Monorepo    | Turborepo + pnpm workspaces                                         |

---

## 🌱 Domain Concepts

- **Group (مجموعة)** — A study group with a timezone, moderator, and a list of members
- **Week (أسبوع)** — A 6-day period (Saturday → Thursday) belonging to a group; auto-incremented
- **Student Wird (وِرْد الطالب)** — A daily recitation record (attended / missed / late) for a student in a specific week
- **Group Member** — A student enrolled in a group, optionally paired with a mate (الزميل المقروء عليه)
- **Request (طلب)** — An excuse or re-activation request submitted by a student, reviewed by a moderator
- **Schedule Image** — schedule image uploaded for a given week

---

## 🚀 Local Setup

### Prerequisites

- Node.js 20+, pnpm 9+, Docker

### 1. Clone & install

```bash
git clone <repo-url>
cd sahibalquran
pnpm install
```

### 2. Start the database

```bash
docker-compose up -d
```

### 3. Configure environment

Copy `.env.example` to `.env` in `apps/backend/` and set:

```
DATABASE_URL="mysql://root:PASSWORD@localhost:3305/sahibalquran"
JWT_SECRET="your-secret"
```

### 4. Run migrations & seed

```bash
cd apps/backend
pnpm prisma:migrate:dev
pnpm tsx src/seed/seed.ts
```

### 5. Start dev servers

```bash
# From root
pnpm dev
```

- Client: http://localhost:3000
- API: http://localhost:5000/api

---

## 🔑 Seeded Accounts

| Role      | Username  | Password |
| --------- | --------- | -------- |
| Admin     | admin     | 12345678 |
| Moderator | moderator | 12345678 |
| Student   | student   | 12345678 |

---

## 📦 Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Start all apps in watch mode         |
| `pnpm build`     | Build all apps                       |
| `pnpm typecheck` | TypeScript check across all packages |
| `pnpm lint`      | Lint all packages                    |
| `pnpm format`    | Format with Prettier                 |
