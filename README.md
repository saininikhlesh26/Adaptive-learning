# Addaptive Learning Interface and Engagement Classifier

## Project overview

This repository currently contains a React + Vite frontend application scaffold. The app is verified to build and run locally, but the full product backlog (backend APIs, database, machine learning, tests, and deployment config) is not yet implemented.

## Current status

- Frontend stack: React 19 + Vite 8
- Verified: `npm install`, `npm run build`, `npm run dev`, `npm run lint`
- Missing: backend, API contract, database models, ML pipeline, tests, deployment configuration

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the local app in a browser:

```text
http://127.0.0.1:4173/
```

4. Build for production:

```bash
npm run build
```

5. Run lint checks:

```bash
npm run lint
```

## Verification checklist

- [x] `npm install` works
- [x] `npm run dev` starts successfully
- [x] `npm run build` completes successfully
- [x] `npm run lint` passes without errors
- [ ] Add backend implementation
- [ ] Add API service layer
- [ ] Add database persistence
- [ ] Add ML pipeline and model files
- [ ] Add automated tests
- [x] Add Vercel deployment config
- [x] Add project-specific documentation and license

## Deployment files

- `vercel.json` — Vercel static build configuration
- `.env.example` — example environment variables for local development and future backend integration

## Notes for reviewers

This repo is currently a frontend prototype. Use the checklist above to track next work items and to validate the local environment.

