# Use Cases

This guide provides real-world examples of using tamamo-x-mcp for different project types.

## Table of Contents

- [Web Development](#web-development)
- [Data Science & Machine Learning](#data-science--machine-learning)
- [DevOps & Infrastructure](#devops--infrastructure)
- [Content Creation & Documentation](#content-creation--documentation)
- [API Development](#api-development)
- [Mobile Development](#mobile-development)

## Web Development

### Full-Stack JavaScript Project

**Project Setup**:

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Version Control: GitHub

**Recommended MCP Servers**:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    "github": {
      "command": "mcp-server-github"
    },
    "postgres": {
      "command": "mcp-server-postgres",
      "args": ["--connection-string", "postgresql://localhost/mydb"]
    },
    "browser": {
      "command": "mcp-server-playwright"
    }
  }
}
```

**Project Context** (`Agent.md`):

```markdown
# Web Development Project

Full-stack JavaScript application:

- Frontend: React 18 + TypeScript + Vite + TailwindCSS
- Backend: Node.js 20 + Express + Prisma ORM
- Database: PostgreSQL 15
- Testing: Vitest + Playwright
- Deployment: Vercel (frontend) + Railway (backend)

Key workflows:

- Component development with hot reload
- API endpoint testing
- Database migrations
- End-to-end testing
```

**Expected Agent Groups**:

1. **Frontend Development** (React components, CSS, assets)
2. **Backend API** (Express routes, middleware, controllers)
3. **Database Management** (Schema, migrations, queries)
4. **Testing & QA** (Unit tests, E2E tests, browser automation)
5. **Git & Deployment** (Commits, PRs, CI/CD)

**Workflow Example**:

```bash
# 1. Initialize project
./dist/tamamo-x init

# 2. Build groups
./dist/tamamo-x build

# 3. Start server
./dist/tamamo-x mcp
```

**Sample Prompts for AI Assistant**:

- "Create a new React component for user profile with TypeScript types"
- "Add a POST endpoint for user registration with validation"
- "Write a database migration to add email verification"
- "Generate E2E tests for the login flow"

## Data Science & Machine Learning

### Python ML Project

**Project Setup**:

- Language: Python 3.11
- Framework: TensorFlow / PyTorch
- Data: Jupyter Notebooks + pandas
- Deployment: FastAPI + Docker

**Recommended MCP Servers**:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    "jupyter": {
      "command": "mcp-server-jupyter"
    },
    "postgres": {
      "command": "mcp-server-postgres",
      "args": ["--connection-string", "postgresql://localhost/ml_data"]
    },
    "github": {
      "command": "mcp-server-github"
    }
  }
}
```

**Project Context** (`Agent.md`):

```markdown
# Machine Learning Project

Computer vision classification task:

- Framework: PyTorch 2.0 + torchvision
- Data Pipeline: pandas + numpy + opencv-python
- Experimentation: Jupyter Notebooks + MLflow
- Model Serving: FastAPI + Docker
- Storage: PostgreSQL (metadata) + S3 (datasets)

Key workflows:

- Data preprocessing and augmentation
- Model training and hyperparameter tuning
- Experiment tracking and visualization
- Model evaluation and deployment
```

**Expected Agent Groups**:

1. **Data Processing** (Load, clean, transform datasets)
2. **Model Development** (Define, train, evaluate models)
3. **Experimentation** (Jupyter notebooks, plotting, tracking)
4. **Deployment** (API endpoints, Docker, serving)
5. **Version Control** (Git, DVC, model registry)

**Workflow Example**:

```bash
# Set up with Anthropic (Claude excels at data analysis)
export ANTHROPIC_API_KEY="your-key"
./dist/tamamo-x init
./dist/tamamo-x build
./dist/tamamo-x mcp
```

**Sample Prompts for AI Assistant**:

- "Load and preprocess the CIFAR-10 dataset with augmentation"
- "Define a ResNet-50 model in PyTorch with custom head"
- "Create a training loop with learning rate scheduling"
- "Generate a FastAPI endpoint for model inference"

## DevOps & Infrastructure

### Kubernetes + AWS Project

**Project Setup**:

- Cloud: AWS (EKS, RDS, S3)
- Orchestration: Kubernetes + Helm
- IaC: Terraform
- CI/CD: GitHub Actions

**Recommended MCP Servers**:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    "kubernetes": {
      "command": "mcp-server-kubernetes"
    },
    "aws": {
      "command": "mcp-server-aws"
    },
    "github": {
      "command": "mcp-server-github"
    }
  }
}
```

**Project Context** (`Agent.md`):

```markdown
# DevOps Infrastructure

Production infrastructure for microservices:

- Cloud Provider: AWS (EKS, RDS, ElastiCache, S3, CloudWatch)
- Container Orchestration: Kubernetes 1.28 + Helm 3
- Infrastructure as Code: Terraform 1.5
- CI/CD: GitHub Actions + ArgoCD
- Monitoring: Prometheus + Grafana + Datadog

Key workflows:

- Infrastructure provisioning with Terraform
- Kubernetes manifests and Helm charts
- CI/CD pipeline configuration
- Monitoring and alerting setup
```

**Expected Agent Groups**:

1. **Infrastructure Provisioning** (Terraform, AWS resources)
2. **Kubernetes Management** (Deployments, services, configs)
3. **CI/CD Automation** (Pipelines, workflows, deployments)
4. **Monitoring & Observability** (Metrics, logs, alerts)
5. **Security & Compliance** (IAM, secrets, policies)

**Configuration Tips**:

```json
{
  "llmProvider": {
    "type": "anthropic"
  },
  "groupingConstraints": {
    "minToolsPerGroup": 5,
    "maxToolsPerGroup": 15,
    "minGroups": 5,
    "maxGroups": 8
  }
}
```

**Sample Prompts for AI Assistant**:

- "Create a Terraform module for EKS cluster with node groups"
- "Write a Kubernetes deployment for a Node.js microservice"
- "Set up a GitHub Actions workflow for CI/CD pipeline"
- "Configure Prometheus alerts for high memory usage"

## Content Creation & Documentation

### Documentation Project

**Project Setup**:

- Docs: Markdown + MDX
- Generator: Docusaurus / VitePress
- Assets: Images, diagrams
- Publishing: Vercel / Netlify

**Recommended MCP Servers**:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    "github": {
      "command": "mcp-server-github"
    },
    "brave-search": {
      "command": "mcp-server-brave-search"
    }
  }
}
```

**Project Context** (`Agent.md`):

```markdown
# Documentation Project

Technical documentation site:

- Framework: Docusaurus 3
- Content: Markdown + MDX + React components
- Diagrams: Mermaid + Excalidraw
- Search: Algolia DocSearch
- Deployment: Vercel

Key workflows:

- Writing technical guides and tutorials
- Creating diagrams and visual content
- Organizing documentation structure
- SEO optimization and accessibility
```

**Expected Agent Groups**:

1. **Content Writing** (Markdown files, guides, tutorials)
2. **Asset Management** (Images, diagrams, code snippets)
3. **Site Configuration** (Navigation, metadata, plugins)
4. **Research & References** (Web search, link checking)
5. **Publishing** (Build, deploy, optimization)

**Sample Prompts for AI Assistant**:

- "Write a getting started guide for the API with code examples"
- "Create a Mermaid diagram showing the authentication flow"
- "Organize the sidebar navigation structure"
- "Generate OpenGraph metadata for social media previews"

## API Development

### REST API Project

**Project Setup**:

- Framework: FastAPI (Python) or Express (Node.js)
- Database: PostgreSQL + Redis
- Documentation: OpenAPI/Swagger
- Testing: Pytest / Jest

**Recommended MCP Servers**:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    "postgres": {
      "command": "mcp-server-postgres",
      "args": ["--connection-string", "postgresql://localhost/api_db"]
    },
    "redis": {
      "command": "mcp-server-redis",
      "args": ["--url", "redis://localhost:6379"]
    },
    "github": {
      "command": "mcp-server-github"
    }
  }
}
```

**Project Context** (`Agent.md`):

```markdown
# REST API Project

RESTful API for e-commerce platform:

- Framework: FastAPI 0.104 + Pydantic v2
- Database: PostgreSQL 15 + SQLAlchemy 2.0
- Caching: Redis 7 + redis-py
- Authentication: JWT + OAuth2
- Documentation: OpenAPI 3.1 + Swagger UI
- Testing: pytest + pytest-asyncio + httpx

Key workflows:

- API endpoint development
- Database schema design and migrations
- Authentication and authorization
- Caching strategy implementation
- API documentation generation
```

**Expected Agent Groups**:

1. **Endpoint Development** (Routes, handlers, validation)
2. **Database Operations** (Models, migrations, queries)
3. **Caching & Performance** (Redis, query optimization)
4. **Authentication & Security** (JWT, OAuth, middleware)
5. **Testing & Documentation** (Unit tests, API docs)

**Configuration Example**:

```json
{
  "version": "1.0.0",
  "mcpServers": [
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    {
      "name": "postgres",
      "transport": "stdio",
      "command": "mcp-server-postgres",
      "args": ["--connection-string", "postgresql://localhost/api_db"]
    }
  ],
  "llmProvider": {
    "type": "anthropic",
    "model": "claude-4-5-haiku"
  },
  "projectContext": {
    "agentFilePath": "Agent.md"
  }
}
```

**Sample Prompts for AI Assistant**:

- "Create a POST /users endpoint with email validation"
- "Design a database schema for products and orders"
- "Implement JWT authentication middleware"
- "Add Redis caching for frequently accessed products"

## Mobile Development

### React Native Project

**Project Setup**:

- Framework: React Native + Expo
- State: Redux Toolkit / Zustand
- Navigation: React Navigation
- Backend: REST API

**Recommended MCP Servers**:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    "github": {
      "command": "mcp-server-github"
    },
    "figma": {
      "command": "mcp-server-figma"
    }
  }
}
```

**Project Context** (`Agent.md`):

```markdown
# Mobile App Project

Cross-platform mobile application:

- Framework: React Native 0.72 + Expo SDK 49
- Language: TypeScript 5.0
- State Management: Zustand + React Query
- Navigation: React Navigation 6
- UI: React Native Paper + custom components
- Backend: REST API + WebSocket
- Testing: Jest + React Native Testing Library

Key workflows:

- Screen and component development
- State management and data fetching
- Navigation configuration
- Platform-specific code (iOS/Android)
- Push notifications and deep linking
```

**Expected Agent Groups**:

1. **UI Development** (Screens, components, styling)
2. **State Management** (Stores, actions, queries)
3. **Navigation** (Screens flow, deep linking)
4. **API Integration** (HTTP requests, WebSocket, auth)
5. **Platform Features** (Camera, notifications, permissions)

**Sample Prompts for AI Assistant**:

- "Create a login screen with form validation"
- "Set up Zustand store for user authentication"
- "Implement pull-to-refresh for feed screen"
- "Add push notification handling for iOS and Android"

## Best Practices for All Use Cases

### 1. Project Context

Always create an `Agent.md` file with:

- Technology stack details
- Project structure overview
- Common workflows
- Naming conventions
- Architecture patterns

### 2. Grouping Constraints

Adjust based on project size:

**Small Projects** (< 20 tools):

```json
{
  "groupingConstraints": {
    "minToolsPerGroup": 3,
    "maxToolsPerGroup": 10,
    "minGroups": 2,
    "maxGroups": 5
  }
}
```

**Large Projects** (> 50 tools):

```json
{
  "groupingConstraints": {
    "minToolsPerGroup": 8,
    "maxToolsPerGroup": 25,
    "minGroups": 5,
    "maxGroups": 12
  }
}
```

### 3. Iterative Refinement

Rebuild groups as your project evolves:

```bash
# Update project context
vim Agent.md

# Rebuild groups
./dist/tamamo-x build

# Review new groupings
cat .tamamo-x/groups/*/description.md
```

### 4. Custom Hints

Add custom hints to `Agent.md` for better grouping:

```markdown
# Project Context

- Use feature-based grouping (auth, payments, notifications)
- Separate read-only from write operations
- Group by data domain (users, products, orders)
- Keep critical operations in dedicated groups
```

## Next Steps

- **[Getting Started](getting-started.md)**: Complete setup tutorial
- **[Usage Guide](usage.md)**: Detailed configuration options
- **[Troubleshooting](troubleshooting.md)**: Fix common issues
