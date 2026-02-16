# CLAUDE.md - GymTrack

## Project Overview

GymTrack is a mobile fitness tracking application built with Expo (React Native). It provides workout logging, exercise library management, personal record tracking, and body measurement history. The app uses local-first SQLite storage with optional Supabase backend for authentication.

## Tech Stack

- **Framework:** Expo SDK 54 with Expo Router v6 (file-based routing)
- **Language:** TypeScript 5.9 (strict mode)
- **UI:** React Native 0.81 + NativeWind 4 (TailwindCSS 3 for React Native)
- **State Management:** Zustand 5 with AsyncStorage persistence
- **Database:** expo-sqlite (local SQLite with WAL mode)
- **Auth:** Supabase (configured, uses Expo Secure Store for token storage)
- **Data Fetching:** TanStack React Query 5
- **Validation:** Zod 4
- **Date Handling:** date-fns 4
- **Node:** 22 (see .nvmrc)

## Project Structure

```
app/                        # Expo Router file-based routing
├── _layout.tsx             # Root layout
├── (tabs)/                 # Tab navigator group
│   ├── _layout.tsx         # Tab bar configuration
│   ├── index.tsx           # Home/Dashboard
│   ├── workout.tsx         # Active workout screen
│   ├── history.tsx         # Workout history
│   ├── progress.tsx        # Progress/Analytics
│   └── profile.tsx         # User profile
└── exercises/              # Exercise selection screens

lib/                        # Core business logic
├── db/
│   ├── database.ts         # SQLite init, schema (7 tables), migrations
│   ├── exercises.ts        # Exercise CRUD, 350+ pre-seeded exercises
│   └── workouts.ts         # Workout lifecycle, sets, PR tracking
└── supabase.ts             # Supabase client configuration

stores/                     # Zustand state stores
├── auth-store.ts           # Authentication state
├── workout-store.ts        # Active workout state
├── settings-store.ts       # User preferences (units, theme, rest timer)
└── index.ts                # Store exports

types/                      # TypeScript type definitions
└── index.ts                # All entity types and enums

constants/                  # App constants
├── index.ts                # Muscle groups, equipment, timer presets, weight increments
└── colors.ts               # Color palette and theme values
```

## Commands

```bash
npx expo start              # Start dev server
npx expo run:android        # Run on Android
npx expo run:ios            # Run on iOS
npx expo start --web        # Start web version
npx jest                    # Run tests (Jest 29 + Testing Library)
npx tsc --noEmit            # Type check
```

## Database Schema

SQLite database (`gymtrack.db`) with WAL mode and foreign keys enabled. Tables:

| Table | Purpose |
|-------|---------|
| `exercises` | Exercise library (350+ seeded + custom) |
| `workouts` | Workout sessions with timestamps and duration |
| `workout_exercises` | Exercises within a workout (ordered) |
| `workout_sets` | Individual sets (reps, weight, warmup/completed flags) |
| `personal_records` | PR tracking per exercise |
| `body_measurements` | Body weight history |

Key indexes exist on `workouts.started_at`, `workout_exercises.workout_id`, `workout_sets.workout_exercise_id`, `exercises.primary_muscle`, and `personal_records.exercise_id`.

## Coding Conventions

### Naming

- **Database columns/types:** `snake_case` (matching SQLite) — e.g., `primary_muscle`, `is_completed`
- **TypeScript interfaces:** `PascalCase` — e.g., `Exercise`, `WorkoutSet`, `WorkoutExerciseWithDetails`
- **Functions/variables:** `camelCase` — e.g., `createWorkout`, `completeSet`
- **Constants:** `UPPER_SNAKE_CASE` — e.g., `REST_TIMER_PRESETS`, `WEIGHT_INCREMENTS`

### TypeScript Patterns

- Strict mode is enabled — do not disable or use `any` unnecessarily
- Type unions for domain enums: `type MuscleGroup = "chest" | "back" | ...`
- SQLite booleans are stored as integers (0/1), reflected in types as `number`
- Dates stored as ISO strings in the database
- Enriched types extend base types with joined data (e.g., `WorkoutExerciseWithDetails`)
- Path alias: `@/*` maps to project root

### State Management

- Zustand stores use `create<T>((set, get) => ({...}))` pattern
- Settings store persists to AsyncStorage
- Store actions call database functions directly

### UI Patterns

- Expo Router for file-based navigation with `(tabs)` layout group
- `useColorScheme()` for dark/light mode detection
- Primary color: `#10b981` (emerald green)
- Icons: Ionicons from `@expo/vector-icons`
- Styling via NativeWind `className` props (TailwindCSS utility classes)
- `SafeAreaView` for safe area handling

### Database Patterns

- Singleton database instance via `getDatabase()`
- All DB operations are async functions returning typed results
- Manual SQL queries (no ORM) with TypeScript-typed returns
- Batch inserts for seeding (50-item batches)
- UUID generation via random string replacement

## Environment Variables

Required for Supabase integration (optional for local-only mode):

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

## Build Configuration

- **EAS Build** profiles: `development`, `preview`, `production`
- iOS bundle ID: `com.ggs.gymtrack`
- Android package: `com.ggs.gymtrack`
- New Architecture enabled
- Typed routes enabled via Expo Router experiments
