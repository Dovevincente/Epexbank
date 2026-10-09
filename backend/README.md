# Epex Bank Backend

Epex Bank is a modern digital banking platform backend built with Node.js, Express, Prisma, and PostgreSQL.

## Technology Stack

- Node.js
- Express
- PostgreSQL
- Prisma ORM
- JWT authentication
- bcryptjs
- Zod validation
- Helmet
- Express Rate Limit
- Morgan
- Socket.IO
- CORS

## Main Features

- Customer registration and authentication
- JWT access and refresh tokens
- Customer profiles
- Bank accounts
- Wallets
- Internal transfers
- Bank transfers
- Transactions
- Ledger entries
- Deposits
- Withdrawals
- Payments
- Savings
- Investments
- Shares
- Loans
- KYC
- Cards
- Notifications
- Customer support
- Administration
- Audit logging
- Real-time Socket.IO events

## Project Structure

```text
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── sockets/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
└── README.md
