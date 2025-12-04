# Estate Agency Backend - DESIGN.md

## 1. Architecture & Data Model

### 1.1 NestJS Module Structure

The project is designed with layered architecture principles. Each module has its own responsibility:

```
src/
├── main.ts                          # Application entry point
├── modules/
│   ├── app.module.ts                # Main module - brings all modules together
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

**Why this structure?**
- **Separation of Concerns**: Each module focuses on its own domain
- **Scalability**: New features can be easily added
- **Testability**: Modules can be tested independently
- **Maintainability**: Code organization and maintenance is easy

### 1.2 MongoDB Document Design

#### Transaction Collection
```javascript
{
  _id: ObjectId,
  propertyAddress: String,        // Property address
  propertyType: String,           // Property type
  totalServiceFee: Number,        // Total commission amount
  stage: Enum,                    // Transaction stage (agreement, earnest_money, title_deed, completed)
  listingAgentId: ObjectId,       // Listing agent
  sellingAgentId: ObjectId,       // Selling agent
  clientName: String,             // Client name
  clientContact: String,          // Client contact
  financialBreakdown: {           // Filled only in completed stage
    agencyCommission: Number,
    totalAgentCommission: Number,
    listingAgentCommission: Number,
    sellingAgentCommission: Number,
    listingAgentId: ObjectId,
    sellingAgentId: ObjectId
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Agent Collection
```javascript
{
  _id: ObjectId,
  email: String,                   // Unique email
  firstName: String,
  lastName: String,
  phone: String,
  type: Enum,                     // listing, selling, both
  isActive: Boolean,               // Active/inactive status
  totalCommissionEarned: Number,  // Total earnings
  transactionCount: Number,        // Completed transaction count
  createdAt: Date,
  updatedAt: Date
}
```

#### Commission Collection
```javascript
{
  _id: ObjectId,
  transactionId: ObjectId,        // Related transaction
  agentId: ObjectId,               // Agent ID (null for company commission)
  amount: Number,                  // Commission amount
  commissionType: String,          // listing, selling, agency
  status: Enum,                    // pending, processed, paid
  paidDate: Date,                  // Payment date
  notes: String,                   // Notes
  createdAt: Date,
  updatedAt: Date
}
```

**Why this design?**

1. **Embedded vs Reference Decision**: 
   - Embedded `financialBreakdown` in Transaction because:
     - Only one per transaction
     - Read together (read pattern)
     - Atomic update required
   - Separate `Commission` collection because:
     - Independent queries needed (agent-based reporting)
     - Status transitions to track
     - Separate lifecycle for payment tracking

2. **Index Strategy**:
   ```javascript
   // Transaction indexes
   { stage: 1 }                    // Stage-based filtering
   { listingAgentId: 1 }           // Agent performance
   { sellingAgentId: 1 }           // Agent performance
   { createdAt: -1 }               // Date-based sorting
   
   // Agent indexes
   { email: 1 }                    // Unique login
   { isActive: 1 }                  // Active agent list
   { totalCommissionEarned: -1 }   // Performance ranking
   
   // Commission indexes
   { transactionId: 1 }            // Transaction-based queries
   { agentId: 1 }                  // Agent-based reporting
   { status: 1 }                   // Status-based filtering
   ```

### 1.3 API Design

Designed according to RESTful principles:

```
GET    /transactions              # All transactions
POST   /transactions              # New transaction
GET    /transactions/:id          # Transaction details
PATCH  /transactions/:id/stage    # Stage update
GET    /transactions/:id/financial-summary  # Financial summary

GET    /agents                    # All agents
POST   /agents                    # New agent
GET    /agents/:id                # Agent details
PATCH  /agents/:id                # Agent update
GET    /agents/:id/stats          # Agent statistics

GET    /commissions               # All commissions
GET    /commissions/agent/:id     # Agent commissions
PATCH  /commissions/:id/status    # Status update
GET    /commissions/summary/overall  # Overall summary
```

## 2. Most Challenging / Riskiest Part

### 2.1 Riskiest Design Decision: Commission Calculation Architecture

**Problem**: Commission calculation business logic is complex and critical. Incorrect calculations can lead to financial losses.

**Risks**:
- Race conditions (concurrent transaction updates)
- Changes in commission rules
- Data inconsistencies
- Performance issues

**Mitigation Strategies**:

1. **Atomic Operations**:
   ```typescript
   // Transaction and Commission updated simultaneously
   const session = await mongoose.startSession();
   session.startTransaction();
   
   try {
     transaction.financialBreakdown = breakdown;
     await transaction.save({ session });
     await Commission.insertMany(commissions, { session });
     await session.commitTransaction();
   } catch (error) {
     await session.abortTransaction();
     throw error;
   }
   ```

2. **Validation Layer**:
   ```typescript
   validateCommissionRules(breakdown: FinancialBreakdown): boolean {
     // Mathematical validation
     const total = breakdown.agencyCommission + 
                   breakdown.listingAgentCommission + 
                   breakdown.sellingAgentCommission;
     
     // Rule validation
     return this.isValidPercentage(total, breakdown.totalServiceFee);
   }
   ```

3. **Event-Driven Approach**:
   ```typescript
   // Automatically triggered when transaction completes
   @EventPattern('transaction_completed')
   async handleTransactionCompleted(data: TransactionCompletedEvent) {
     await this.commissionCalculationService.processCompletedTransaction(data.transactionId);
   }
   ```

4. **Comprehensive Testing**:
   - Unit tests for calculation logic
   - Integration tests for database operations
   - Edge case scenarios (zero commission, negative values)

### 2.2 Alternative Approaches Rejected

1. **Stored Procedures**: Limited support in MongoDB, testing difficulty
2. **Microservices**: Overkill for current requirements
3. **Rule Engine**: Complexity outweighs benefits for simple 50/50 split

## 3. If Implemented in Real Life — What Next?

### 3.1 Immediate Improvements

1. **Authentication & Authorization**:
   ```typescript
   @UseGuards(JwtAuthGuard)
   @Controller('transactions')
   export class TransactionsController {
     @Post()
     @Roles(Role.AGENT, Role.ADMIN)
     async create(@Body() dto: CreateTransactionDto) {
       // Only authorized users can create transactions
     }
   }
   ```

2. **Audit Trail**:
   ```typescript
   @Schema()
   export class AuditLog extends Document {
     @Prop()
     action: string;           // CREATE, UPDATE, DELETE
     
     @Prop()
     entityType: string;       // Transaction, Agent
     
     @Prop()
     entityId: ObjectId;
     
     @Prop()
     userId: ObjectId;         // User who performed the action
     
     @Prop()
     changes: Object;          // Change details
     
     @Prop({ default: Date.now })
     timestamp: Date;
   }
   ```

3. **Advanced Reporting**:
   - Monthly/quarterly commission reports
   - Agent performance analytics
   - Property type profitability analysis
   - Geographic performance metrics

### 3.2 Medium-term Features

1. **Notification System**:
   ```typescript
   @Injectable()
   export class NotificationService {
     async notifyStageChange(transactionId: string, newStage: TransactionStage) {
       // Email/SMS/Push notifications
       await this.emailService.sendStageUpdate(transaction);
       await this.smsService.sendUrgentAlerts(newStage);
     }
   }
   ```

2. **Document Management**:
   ```typescript
   @Schema()
   export class Document extends Document {
     @Prop()
     transactionId: ObjectId;
     
     @Prop()
     documentType: string;     // contract, deed, payment_proof
     
     @Prop()
     fileUrl: string;
     
     @Prop()
     uploadedBy: ObjectId;
   }
   ```

3. **Workflow Automation**:
   - Automatic stage progression based on document uploads
   - Escalation rules for overdue transactions
   - Integration with external property databases

### 3.3 Long-term Vision

1. **Machine Learning Integration**:
   - Commission prediction models
   - Agent performance forecasting
   - Market trend analysis

2. **Multi-tenant Architecture**:
   - Support for multiple agencies
   - Agency-specific commission rules
   - White-label solutions

3. **Real-time Features**:
   - WebSocket connections for live updates
   - Real-time commission tracking
   - Live transaction status dashboard

4. **Integration Ecosystem**:
   - CRM system integrations
   - Accounting software connections
   - Property listing platform APIs
   - Banking/payment gateway integrations

### 3.4 Why These Features?

1. **Business Value**: Each feature addresses specific pain points in estate agency operations
2. **Scalability**: Architecture supports growth without major rewrites
3. **Competitive Advantage**: Advanced analytics and automation differentiate from competitors
4. **Revenue Opportunities**: Premium features can drive additional revenue streams

This design provides a solid foundation for future growth while meeting current requirements.