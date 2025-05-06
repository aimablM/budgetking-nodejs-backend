<p align="center">
  <img src="img/amlogo.svg" alt="My Logo" width="100" height="100">
</p>

# BudgetKing Node.js Backend

A containerized Node.js Express API for the BudgetKing personal finance tracker iOS application. This repository contains the backend API code and deployment configuration for a financial tracking application that integrates with the Plaid API.

## Project Overview

BudgetKing is a personal finance tracking application with an iOS Swift frontend and a Node.js backend. This repository contains the backend API, which has been containerized with Docker and deployed to AWS EC2 with Nginx as a reverse proxy and Let's Encrypt for SSL.

The API provides authentication, user management, and financial data integration with Plaid to retrieve bank account transactions and financial information.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  iOS Swift App  │ ──➤  │  Nginx Reverse  │ ──➤  │  Docker        │
│  (SwiftUI)      │      │  Proxy + SSL    │      │  Container      │
│                 │      │                 │      │  (Node.js API)  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │                 │
                                                  │  MongoDB        │
                                                  │  Database       │
                                                  │                 │
                                                  └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │                 │
                                                  │  Plaid API      │
                                                  │  Integration    │
                                                  │                 │
                                                  └─────────────────┘
```

## Process Flow

![Diagram](/img/process-flow.png)

## Tech Stack

- **Backend**: Node.js, Express.js
- **Authentication**: JWT (JSON Web Tokens), bcrypt
- **Database**: MongoDB with Mongoose
- **External API**: Plaid API for financial data
- **Containerization**: Docker
- **Deployment**: AWS EC2 (Ubuntu)
- **Web Server**: Nginx (Reverse Proxy)
- **SSL/TLS**: Let's Encrypt wildcard certificate
- **DNS**: AWS Route 53

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker
- MongoDB
- Plaid API credentials

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
```

### Local Development Setup

1. Clone the repository
   ```
   git clone https://github.com/yourusername/budgetking-nodejs-backend.git
   cd budgetking-nodejs-backend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Run in development mode
   ```
   npm run devStart
   ```

4. The API will be available at `http://localhost:5000`

### Docker Build & Run

1. Build the Docker image
   ```
   docker build -t budgetking-api:latest .
   ```

2. Run the container
   ```
   docker run -p 5000:5000 --env-file .env -d budgetking-api:latest
   ```

3. For AMD64 architecture (Linux deployment)
   ```
   docker build --platform linux/amd64 -t budgetking-api:latest .
   ```

## Deployment

### Pushing to Docker Hub

1. Tag the image
   ```
   docker tag budgetking-api:latest aimablm/budgetking:latest
   ```

2. Push to Docker Hub
   ```
   docker push aimablm/budgetking:latest
   ```

### EC2 Deployment

1. SSH into your EC2 instance
   ```
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

2. Pull the Docker image
   ```
   docker pull aimablm/budgetking:latest
   ```

3. Create an `.env` file with environment variables
   ```
   nano .env
   # Add environment variables as listed above
   ```

4. Run the container
   ```
   docker run -p 5000:5000 --env-file .env -d aimablm/budgetking:latest
   ```

### Nginx Configuration

Configure Nginx as a reverse proxy:

1. Edit the Nginx configuration file
   ```
   sudo nano /etc/nginx/sites-available/default
   ```

2. Add or update the server block:
   ```nginx
   server {
       listen 80;
       server_name api.aimablem.dev;
       
       location / {
           return 301 https://$host$request_uri;
       }
   }

   server {
       listen 443 ssl;
       server_name api.aimablem.dev;

       # SSL Configuration
       ssl_certificate /etc/letsencrypt/live/aimablem.dev/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/aimablem.dev/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_prefer_server_ciphers on;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;

       # Proxy settings
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Test and reload Nginx
   ```
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### DNS Configuration (AWS Route 53)

1. Add an A record in Route 53:
   - Name: `api.aimablem.dev`
   - Type: A
   - Value: Your EC2 instance's public IP address
   - TTL: 300

2. Wait for DNS propagation (typically 5-15 minutes)

## API Health Check

The API has a built-in health check endpoint at `/health` that returns a simple message to confirm the API is running.

```
GET /health
Response: "API is running"
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/register` | POST | Register new user |
| `/api/login` | POST | User login |
| `/api/updateUsername` | POST | Update username |
| `/api/updatePassword` | POST | Update password |
| `/api/create_link_token` | POST | Create Plaid link token |
| `/api/exchange_token` | POST | Exchange Plaid public token |
| `/api/transactions` | GET | Get user transactions |

## Deployment Screenshots

![EC2 Docker Deployment](https://placeholder-for-deployment-screenshot.png)
![Nginx Server Running](https://placeholder-for-nginx-screenshot.png)

## Credits & Ownership

- **DevOps & Deployment**: Implemented by [Your Name]
  - Docker containerization
  - AWS EC2 deployment
  - Nginx configuration
  - SSL/TLS setup
  - DNS configuration

- **Backend Development**: Implemented by team members
  - Node.js Express API
  - Authentication system
  - Plaid API integration
  - MongoDB integration

## Live URL

The API is live at: [https://api.aimablem.dev](https://api.aimablem.dev)

---

