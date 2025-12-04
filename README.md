# Estate Agency Backend System

An automated transaction tracking and commission management system developed for real estate agencies.

## 🏗️ Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: MongoDB Atlas
- **ODM**: Mongoose
- **Validation**: class-validator, class-transformer
- **Testing**: Jest

## 📋 Features

- ✅ Transaction lifecycle tracking (agreement → earnest_money → title_deed → completed)
- ✅ Automatic commission calculation (50% company, 50% agents)
- ✅ Agent performance tracking and statistics
- ✅ Financial reporting and summaries
- ✅ RESTful API endpoints
- ✅ Data validation and error handling
- ✅ Unit test coverage

## 🚀 Installation

### Prerequisites

- Node.js (LTS)
- MongoDB Atlas account
- npm or yarn

### Step 1: Clone the project

```bash
git clone <repository-url>
cd estate-agency-backend
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Configure environment variables

```bash
# Copy .env.example file
cp .env.example .env

# Edit .env file
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/estate-agency?retryWrites=true&w=majority
PORT=3000
```

### Step 4: MongoDB Atlas connection

1. Create a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
2. Create a new cluster
3. Create a database user
4. Add your IP address in Network access (0.0.0.0/0 for all IPs)
5. Copy the connection string and paste it into .env file

## 🏃 Running

### Development mode

```bash
npm run start:dev
```

### Production mode

```bash
npm run build
npm run start:prod
```

### Debug mode

```bash
npm run start:debug
```

## 🧪 Tests

### Run unit tests

```bash
npm run test
```

## 📚 API Documentation

### Transactions

#### Create new transaction

```http
POST /transactions
Content-Type: application/json

{
  "propertyAddress": "Istanbul, Besiktas, Levent",
  "propertyType": "Apartment",
  "totalServiceFee": 50000,
  "listingAgentId": "64a1b2c3d4e5f6789012345",
  "sellingAgentId": "64a1b2c3d4e5f6789012346",
  "clientName": "Ahmet Yilmaz",
  "clientContact": "ahmet.yilmaz@email.com"
}
````

#### Update transaction stage

```http
PATCH /transactions/64a1b2c3d4e5f6789012345/stage
Content-Type: application/json

{
  "stage": "completed"
}
```

#### Financial summary

```http
GET /transactions/64a1b2c3d4e5f6789012345/financial-summary
```

### Agents

#### Create new agent

```http
POST /agents
Content-Type: application/json

{
  "email": "john.doe@realestate.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+905321234567",
  "type": "both"
}
```

#### Agent statistics

```http
GET /agents/64a1b2c3d4e5f6789012345/stats
```

### Commissions

#### Agent commissions

```http
GET /commissions/agent/64a1b2c3d4e5f6789012345
```

#### Overall commission summary

```http
GET /commissions/summary/overall
```

## 💡 Commission Calculation Rules

### Scenario 1: Same Agent

- Listing and selling agent are the same person
- Agent receives 100% of agent share (50% of total commission)

### Scenario 2: Different Agents

- Listing and selling agents are different
- Agent share is split equally (25% each)

### Distribution Formula

```
Total Commission = 100,000 TL
├── Company Share (50%) = 50,000 TL
└── Agent Share (50%) = 50,000 TL
    ├── Listing Agent = 25,000 TL (different agents) / 50,000 TL (same agent)
    └── Selling Agent = 25,000 TL (different agents) / 0 TL (same agent)
```

## 🏗️ Project Structure

```
src/
├── main.ts                          # Application entry point
├── modules/                         # NestJS modules
│   ├── app.module.ts                # Main module
│   ├── agents/
│   │   └── agents.module.ts         # Agent management module
│   ├── transactions/
│   │   ├── transactions.module.ts   # Transaction management module
│   │   └── commission-calculation.module.ts  # Commission calculation engine
│   └── commissions/
│       └── commissions.module.ts    # Commission tracking module
├── controllers/                     # API endpoints
│   ├── app.controller.ts
│   ├── agents.controller.ts
│   ├── transactions.controller.ts
│   └── commissions.controller.ts
├── services/                        # Business logic layer
│   ├── app.service.ts
│   ├── agents/
│   │   └── agents.service.ts
│   ├── transactions/
│   │   ├── transactions.service.ts
│   │   └── commission-calculation.service.ts
│   └── commissions/
│       └── commissions.service.ts
├── models/                          # MongoDB schemas
│   ├── agents/
│   │   └── agent.schema.ts
│   ├── transactions/
│   │   └── transaction.schema.ts
│   └── commissions/
│       └── commission.schema.ts
├── dtos/                            # Data transfer objects
│   ├── agents/
│   │   ├── create-agent.dto.ts
│   │   └── update-agent.dto.ts
│   ├── transactions/
│   │   ├── create-transaction.dto.ts
│   │   └── update-transaction-stage.dto.ts
│   └── commissions/
│       ├── create-commission.dto.ts
│       └── update-commission.dto.ts
└── database/
    └── database.module.ts           # MongoDB connection configuration
```
