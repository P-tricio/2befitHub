# Project Skills & Knowledge

This file documents the core technical patterns, architecture decisions, and specialized knowledge for the **ANTIGRAVITY / 2BEFITHUB** project. It serves as a primary reference for both human developers and AI agents.

## Core Technical Patterns

### 1. Date & Time Management
- **Rule**: All Firestore timestamps or raw date strings must be processed through `ensureDate()` before formatting.
- **Utility**: `src/lib/dateUtils.js`
- **Avoid**: Direct use of `new Date(timestamp)` without validation, as it crashes on null/invalid values.

### 2. Media & Storage Infrastructure
- **Service**: `src/modules/training/services/storageService.js`
- **Features**:
  - **Client-side Compression**: Images (except GIFs) are compressed to 1200px/0.7 quality before upload.
  - **File Size Limit**: Strict 50MB limit on all uploads.
  - **Native Support**: Integrated handling for audio (voice messages), video (native previews), and document files.

### 3. Chat & Communication
- **Architecture**: Dual-sided chat (Athlete: `ChatDrawer.jsx` | Admin: `AdminChatManager.jsx`).
- **Data Model**: Messages stored in `chats/{athleteId}/messages`.
- **Presence**: Real-time "lastActiveAt" tracking for athletes.

## Development Workflows
Actionable step-by-step guides are located in `.agent/workflows/`. Use these to automate repetitive tasks:
- `create-skill.md`: The meta-skill to document new project patterns.

## PDP (Progressive Density Program) Protocols

### 1. PDP-T (Time Cap)
- **Goal**: Maximize reps within a fixed time window.
- **Logic**: Techo y Suelo (Floor & Ceiling).
  - `> Ceiling`: Increase load +5% or harder variation.
  - `< Floor`: Decrease load -5% or regression.
- **Ranges**:
  - `BASE/BOOST`: 20-40 reps.
  - `BUILD`: 30-50 reps.
  - `BURN`: 50-70 reps.

### 2. PDP-R (Target Reps)
- **Goal**: Complete target reps in the shortest time possible.
- **Logic**: Efficiency Thresholds (60% rule).
  - `< Efficiency Time`: Increase load +5%.
  - `> Time Cap`: Decrease load -5%.
- **Targets**:
  - `BASE/BOOST`: 30 reps (5:00 min cap / 3:00 efficiency).
  - `BUILD`: 40 reps (6:00 min cap / 3:36 efficiency).
  - `BURN`: 60 reps (7:00 min cap / 4:12 efficiency).

### 3. PDP-E (EMOM)
- **Goal**: Maintain technical quality under fatigue (Every Minute On the Minute).
- **Logic**: Success vs Fail.
  - `Perfect Success`: Increase difficulty.
  - `Any Fail`: Decrease load or reps.
- **Config**:
  - `BASE/BOOST`: 4 min (6 reps/min).
  - `BUILD`: 5 min (8 reps/min).
  - `BURN`: 6 min (10 reps/min).
