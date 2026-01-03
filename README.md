# STABLE - Strategic Transaction & Account Balance Lifecycle Engine

## Overview

STABLE is an enterprise-grade governance platform for DCA (Debt Collection Agency) ecosystem management. It provides real-time monitoring, AI-powered analytics, and advanced workflow automation for managing account recovery operations.

## Features

- **Real-time Console Dashboard** - Monitor portfolio performance, recovery variance, and DCA activity
- **DCA Partner Portal** - Secure workspace for collection agencies to manage assigned accounts
- **AI-Powered Predictions** - Machine learning models for recovery probability estimation
- **Event-Driven Architecture** - Scalable backend with Kafka-based event streaming

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui component library
- Recharts for data visualization

### Backend
- Rust microservices (Ingress, Gateway, Assignment, Projection, Lifecycle)
- PostgreSQL for persistent storage
- Apache Kafka (Redpanda) for event streaming
- Python for ML model serving

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose (for backend services)
- Rust toolchain (for backend development)

### Frontend Development

```sh
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Services

```sh
# Start all backend services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Project Structure

```
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── api.ts      # API client
│   │   └── ...
├── backend/            # Rust microservices
│   └── crates/
│       ├── gateway/    # API gateway service
│       ├── ingress/    # Event ingestion service
│       ├── assignment/ # Account assignment logic
│       └── ...
├── ai/                 # Python ML components
└── schemas/            # Protobuf definitions
```

## License

Proprietary - All rights reserved.
