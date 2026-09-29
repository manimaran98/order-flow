# OrderFlow — Malaysian SME Order-to-Payment MVP

## 1. Project Goal

Build a real-world full-stack MVP for Malaysian small businesses that receive orders through informal channels such as WhatsApp, phone calls, Excel, and manual payment tracking.

The goal is **not** to replace a complete POS/accounting system.

The MVP focuses on one narrow problem:

> Small businesses need a simple central system to track orders, stock, payments, and fulfilment without replacing their existing business stack.

The project is also intended as a portfolio/interview project demonstrating:

- Next.js
- React
- TypeScript
- NestJS
- REST APIs
- PostgreSQL
- Prisma
- Docker
- Git/GitHub
- CI/CD
- AWS/cloud deployment
- Basic production infrastructure

---

# 2. Problem

A typical small-business order workflow may look like:

```text
Customer
   ↓
WhatsApp / Phone
   ↓
Owner receives order
   ↓
Checks Excel / POS / memory
   ↓
Checks stock
   ↓
Confirms price
   ↓
Customer makes payment
   ↓
Owner checks bank
   ↓
Updates spreadsheet
   ↓
Warehouse prepares order
   ↓
Driver delivers
   ↓
Owner updates status
```

This creates several problems:

- Orders can be missed.
- Stock information may be outdated.
- Unpaid orders are difficult to track.
- Staff may not know which orders are ready.
- Business owners lack a single operational view.
- Information is scattered between WhatsApp, Excel, POS, banking apps, and paper.
- Manual updates create errors.

---

# 3. Target User

Initial target:

- Malaysian micro/small businesses
- Small distributors
- Wholesalers
- Retail businesses
- Product-based businesses
- Businesses using WhatsApp to receive orders
- Businesses with a small warehouse or stock room
- Businesses with sales agents/resellers

We should avoid trying to serve every SME initially.

---

# 4. Product Hypothesis

### Hypothesis

> If a small business can capture orders, automatically calculate order totals, track stock, record payments, and track fulfilment in one lightweight system, the business can reduce manual operational work and gain better visibility over outstanding orders and stock.

This hypothesis should be validated with real businesses before expanding the product.

---

# 5. MVP

## 5.1 Authentication

Features:

- Register
- Login
- JWT authentication
- Logout
- Protected API routes
- User roles

Initial roles:

```text
ADMIN
STAFF
```

---

# 5.2 Products

Product fields:

```text
id
name
SKU
description
sellingPrice
costPrice
stockQuantity
lowStockThreshold
isActive
createdAt
updatedAt
```

Features:

- Create product
- Update product
- Delete/deactivate product
- Search products
- View product
- Track current stock
- Low-stock detection

---

# 5.3 Customers

Customer fields:

```text
id
name
phone
email
address
notes
createdAt
updatedAt
```

Features:

- Create customer
- Update customer
- View customer
- Search customer
- View customer order history

---

# 5.4 Orders

Order fields:

```text
id
orderNumber
customerId
status
paymentStatus
subtotal
discount
total
notes
createdBy
createdAt
updatedAt
```

Order item fields:

```text
id
orderId
productId
quantity
unitPrice
subtotal
```

Order statuses:

```text
PENDING
CONFIRMED
PACKING
READY
DELIVERED
CANCELLED
```

Payment statuses:

```text
UNPAID
PARTIAL
PAID
```

Features:

- Create order
- Add products
- Calculate subtotal
- Apply discount
- Calculate total
- Update order status
- Cancel order
- View order details
- Search orders
- Filter orders
- Pagination

Example:

```text
GET /orders?page=1&limit=20
GET /orders?status=PENDING
GET /orders?paymentStatus=UNPAID
GET /orders?search=ORD-2026
```

---

# 5.5 Inventory

The MVP should maintain stock when orders are processed.

Basic flow:

```text
Product stock
     ↓
Order created
     ↓
Stock availability checked
     ↓
Order confirmed
     ↓
Stock deducted
```

Important:

Stock deduction must be designed carefully to prevent:

- Negative inventory
- Double deduction
- Race conditions

Use PostgreSQL transactions for operations that update both order and inventory.

---

# 5.6 Payments

Payment fields:

```text
id
orderId
amount
paymentMethod
reference
status
paidAt
createdAt
```

Initial payment methods:

```text
CASH
BANK_TRANSFER
CARD
OTHER
```

MVP functionality:

- Record payment
- Record partial payment
- Mark order as paid
- View outstanding amount
- View payment history

No direct banking integration in MVP.

---

# 5.7 Dashboard

The dashboard should focus on operational attention rather than vanity metrics.

Example:

```text
┌─────────────────────────────────────────┐
│           BUSINESS ATTENTION            │
├─────────────────────────────────────────┤
│                                         │
│ 🔴 7 unpaid orders                     │
│                                         │
│ 🟠 12 products low on stock             │
│                                         │
│ 🟠 4 orders waiting for fulfilment      │
│                                         │
│ 🔵 RM8,420 expected payment             │
│                                         │
│ 🟢 83 orders completed                  │
│                                         │
└─────────────────────────────────────────┘
```

Dashboard metrics:

- Today's orders
- Today's sales
- Outstanding payments
- Pending orders
- Orders awaiting fulfilment
- Low-stock products
- Completed orders

---

# 6. Core User Flow

## Create Order

```text
Customer selected
       ↓
Add products
       ↓
System checks stock
       ↓
Calculate subtotal
       ↓
Apply discount
       ↓
Calculate total
       ↓
Create order
       ↓
PENDING
```

## Confirm Order

```text
PENDING
   ↓
CONFIRMED
   ↓
Stock transaction
   ↓
Stock deducted
```

## Fulfilment

```text
CONFIRMED
   ↓
PACKING
   ↓
READY
   ↓
DELIVERED
```

## Payment

```text
UNPAID
   ↓
PARTIAL
   ↓
PAID
```

Order and payment status should be independent.

Example:

```text
Order Status: DELIVERED
Payment Status: UNPAID
```

This allows outstanding payments to be tracked.

---

# 7. System Architecture

```text
                    ┌───────────────┐
                    │    Browser    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    Next.js    │
                    │    App Router │
                    └───────┬───────┘
                            │ REST
                            ▼
                    ┌───────────────┐
                    │    NestJS     │
                    │      API      │
                    └───────┬───────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
           Auth           Orders       Inventory
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  PostgreSQL   │
                    └───────────────┘
```

---

# 8. Docker Development Architecture

```text
┌──────────────────────────────────────────────┐
│                Docker Compose                │
│                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ Next.js  │   │  NestJS  │   │Postgres  │ │
│  │  :3000   │   │  :4000   │   │  :5432   │ │
│  └──────────┘   └──────────┘   └──────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

Services:

```text
frontend
backend
postgres
```

Future services:

```text
redis
worker
object-storage
```

Only add them when the product requires them.

---

# 9. Backend Architecture

NestJS structure:

```text
backend/
└── src/
    ├── auth/
    ├── users/
    ├── customers/
    ├── products/
    ├── orders/
    ├── inventory/
    ├── payments/
    ├── common/
    └── main.ts
```

Expected architecture:

```text
Controller
    ↓
Service
    ↓
Repository / Prisma
    ↓
PostgreSQL
```

Responsibilities:

### Controller

Handles:

- HTTP requests
- Parameters
- Request body
- HTTP responses

### DTO

Handles:

- Request structure
- Validation

### Service

Handles:

- Business logic
- Workflows
- Transactions

### Prisma

Handles:

- Database access
- Queries
- Migrations

---

# 10. REST API

## Authentication

```http
POST /auth/register
POST /auth/login
GET  /auth/me
```

## Users

```http
GET    /users
GET    /users/:id
PATCH  /users/:id
```

## Customers

```http
GET    /customers
GET    /customers/:id
POST   /customers
PATCH  /customers/:id
DELETE /customers/:id
```

## Products

```http
GET    /products
GET    /products/:id
POST   /products
PATCH  /products/:id
DELETE /products/:id
```

## Orders

```http
GET    /orders
GET    /orders/:id
POST   /orders
PATCH  /orders/:id
DELETE /orders/:id
PATCH  /orders/:id/status
```

## Inventory

```http
GET /inventory
GET /inventory/low-stock
GET /inventory/:productId
```

## Payments

```http
GET  /payments
POST /payments
GET  /payments/:id
```

---

# 11. Database Design

Initial entities:

```text
User
Customer
Product
Order
OrderItem
Payment
InventoryTransaction
```

Relationships:

```text
User
 │
 └── Order

Customer
 │
 └── Order
       │
       └── OrderItem
              │
              └── Product

Order
 │
 └── Payment

Product
 │
 └── InventoryTransaction
```

Important database requirements:

- Foreign keys
- Unique constraints
- Proper indexes
- Transactions
- Timestamps
- Soft deletion where appropriate

Potential indexes:

```text
users.email
products.sku
products.name
orders.orderNumber
orders.status
orders.paymentStatus
orders.customerId
orders.createdAt
```

---

# 12. Inventory Transaction Design

Do not simply change stock without recording why.

Example:

```text
InventoryTransaction

id
productId
type
quantity
referenceType
referenceId
createdBy
createdAt
```

Types:

```text
SALE
RESTOCK
ADJUSTMENT
RETURN
```

Example:

```text
Product stock = 100

SALE       -5
RESTOCK    +20
ADJUSTMENT -2

Current stock = 113
```

This creates an audit trail.

---

# 13. Frontend Architecture

Next.js App Router:

```text
frontend/
└── src/
    ├── app/
    │   ├── login/
    │   ├── register/
    │   ├── dashboard/
    │   ├── orders/
    │   ├── products/
    │   ├── customers/
    │   └── inventory/
    │
    ├── components/
    ├── lib/
    ├── services/
    ├── types/
    └── hooks/
```

Pages:

```text
/login
/register
/dashboard
/orders
/orders/new
/orders/[id]
/products
/products/[id]
/customers
/customers/[id]
/inventory
```

---

# 14. Next.js Concepts Demonstrated

The project should intentionally demonstrate:

- App Router
- Server Components
- Client Components
- SSR
- Data fetching
- Loading states
- Error states
- Dynamic routes
- Route handlers where appropriate
- Authentication
- Form handling
- API integration
- Caching/revalidation where appropriate

Do not force SSR/SSG into every page.

Use the rendering strategy based on the actual requirement.

---

# 15. Authentication

MVP:

```text
Browser
   ↓
Login
   ↓
NestJS
   ↓
Validate credentials
   ↓
JWT
   ↓
Authenticated requests
```

Protected endpoints:

```text
GET /orders
POST /orders
PATCH /orders/:id
GET /inventory
POST /payments
```

Authorization:

```text
ADMIN
STAFF
```

Example:

```text
ADMIN
 ├── Manage users
 ├── Manage products
 ├── Manage inventory
 └── Manage orders

STAFF
 ├── Create orders
 ├── View customers
 ├── Process orders
 └── Record payments
```

---

# 16. Validation

NestJS should validate incoming DTOs.

Example:

```text
CreateProductDto
CreateCustomerDto
CreateOrderDto
CreatePaymentDto
LoginDto
RegisterDto
```

Validation examples:

```text
email → valid email
price → positive number
quantity → positive integer
name → required
```

Never trust frontend validation alone.

---

# 17. Error Handling

API should return consistent errors.

Example:

```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

Handle:

- Validation errors
- Authentication errors
- Authorization errors
- Not found
- Duplicate data
- Insufficient stock
- Database failures

---

# 18. Important Business Rules

### Stock

Never allow:

```text
stock < 0
```

### Order

Cannot confirm an order if there is insufficient stock.

### Payment

Cannot record payment greater than outstanding amount.

### Cancellation

Cancelled orders should restore stock if stock was already deducted.

### Delivery

A cancelled order cannot become delivered.

### Payment status

Automatically calculate:

```text
total
paidAmount
outstandingAmount
```

Example:

```text
Order total:       RM500
Paid:              RM300
Outstanding:       RM200

Payment status: PARTIAL
```

---

# 19. Testing

Backend:

- Unit tests
- Service tests
- Controller tests
- API/integration tests

Important scenarios:

```text
Create user
Login
Create product
Create order
Insufficient stock
Confirm order
Cancel order
Record payment
Partial payment
Overpayment
```

Frontend:

- Form validation
- Login flow
- Order creation
- Dashboard data
- Error states

---

# 20. CI/CD

GitHub Actions:

```text
git push
    ↓
GitHub Actions
    ↓
Install dependencies
    ↓
Lint
    ↓
Run tests
    ↓
Build frontend
    ↓
Build backend
    ↓
Build Docker images
```

Later:

```text
Docker image
    ↓
Amazon ECR
    ↓
AWS deployment
```

---

# 21. Cloud Deployment

Initial production architecture:

```text
                    Internet
                       │
                       ▼
                    AWS ALB
                       │
               ┌───────┴───────┐
               │               │
               ▼               ▼
          Next.js/App       NestJS API
               │               │
               └───────┬───────┘
                       │
                       ▼
                 PostgreSQL
                    RDS
```

Potential AWS services:

```text
ECS / EC2
RDS PostgreSQL
ECR
S3
CloudWatch
IAM
VPC
ALB
Route 53
```

Do not introduce every service into the MVP unnecessarily.

---

# 22. MVP Milestones

## Milestone 1 — Foundation

```text
[ ] Git repository
[ ] Next.js project
[ ] NestJS project
[ ] PostgreSQL
[ ] Docker Compose
[ ] Environment configuration
```

## Milestone 2 — Database

```text
[ ] Prisma
[ ] Database schema
[ ] Initial migration
[ ] Seed data
```

## Milestone 3 — Backend

```text
[ ] Authentication
[ ] Users
[ ] Products
[ ] Customers
[ ] Orders
[ ] Inventory
[ ] Payments
```

## Milestone 4 — Frontend

```text
[ ] Login
[ ] Dashboard
[ ] Products
[ ] Customers
[ ] Orders
[ ] Inventory
[ ] Payments
```

## Milestone 5 — Quality

```text
[ ] Validation
[ ] Error handling
[ ] Unit tests
[ ] Integration tests
[ ] API documentation
```

## Milestone 6 — DevOps

```text
[ ] Production Dockerfiles
[ ] GitHub Actions
[ ] CI pipeline
[ ] Docker image build
[ ] Cloud deployment
```

---

# 23. MVP Definition of Done

The MVP is complete when a business can:

```text
1. Register/login
2. Create products
3. Add customers
4. Create an order
5. Check stock
6. Confirm an order
7. Deduct inventory
8. Process fulfilment
9. Record full/partial payment
10. See outstanding payments
11. See low-stock products
12. View operational dashboard
```

The application must run locally with:

```bash
docker compose up
```

and the complete stack should be reproducible from a clean machine.

---

# 24. Future Features — NOT MVP

Do not build these initially:

- WhatsApp integration
- AI order extraction
- Banking integration
- E-invoice integration
- QR payment integration
- Accounting integration
- Courier integration
- Multi-company SaaS architecture
- Advanced analytics
- Mobile application
- Redis
- Message queues
- Microservices

These can become future product directions.

---

# 25. Possible V2 — WhatsApp Order Extraction

Example incoming message:

> Boss tambah 3 carton 100Plus and 5 carton Coke.

AI could transform it into:

```json
{
  "customer": "Customer Name",
  "items": [
    {
      "product": "100Plus",
      "quantity": 3,
      "unit": "carton"
    },
    {
      "product": "Coke",
      "quantity": 5,
      "unit": "carton"
    }
  ]
}
```

The system should create a **draft order**, not automatically confirm it.

```text
WhatsApp
   ↓
AI extraction
   ↓
Draft Order
   ↓
Staff review
   ↓
Confirm
```

This reduces the risk of AI creating incorrect orders.

---

# 26. Product Validation

Before expanding the MVP, validate the hypothesis with real businesses.

Questions:

1. How do you currently receive customer orders?
2. How do you record orders?
3. Do customers usually order through WhatsApp?
4. How do you check stock?
5. How do you track unpaid orders?
6. How do staff know which orders are ready?
7. How often do order mistakes happen?
8. What tools are currently used?
9. What part of the workflow takes the most manual effort?
10. Would a central order/stock/payment dashboard solve a meaningful problem?

Do not assume the answers.

The MVP should evolve based on actual feedback.

---

# 27. Interview Story

The project should demonstrate that we can reason from:

```text
Real-world problem
       ↓
Product hypothesis
       ↓
MVP requirements
       ↓
System architecture
       ↓
Database design
       ↓
API design
       ↓
Implementation
       ↓
Testing
       ↓
Docker
       ↓
CI/CD
       ↓
Cloud deployment
```

This is more valuable for the interview than simply showing a CRUD application.

---

# 28. Core Technology Stack

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
```

## Backend

```text
NestJS
TypeScript
REST API
JWT
```

## Database

```text
PostgreSQL
Prisma
```

## Infrastructure

```text
Docker
Docker Compose
Nginx (if needed)
Linux
```

## CI/CD

```text
GitHub Actions
```

## Cloud

```text
AWS
```

Potential services:

```text
ECR
ECS/EC2
RDS
S3
CloudWatch
IAM
VPC
ALB
Route 53
```

---

# 29. Development Principle

Build the smallest useful version first.

Do not over-engineer.

Start as:

```text
Next.js
     ↓
NestJS
     ↓
PostgreSQL
```

Then add complexity only when there is a real requirement.

The goal is to demonstrate:

- Clean architecture
- Strong TypeScript
- REST API design
- Database modelling
- Transaction handling
- Authentication
- Testing
- Containerisation
- CI/CD
- Cloud deployment
- Practical product thinking

---

# 30. First Build Target

The first working version should contain only:

```text
Next.js
    +
NestJS
    +
PostgreSQL
    +
Prisma
    +
Docker Compose

        ↓

Authentication
        +
Products
        +
Customers
        +
Orders
        +
Inventory
        +
Payments
        +
Dashboard
```

Everything else comes later.
