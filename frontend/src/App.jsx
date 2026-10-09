import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { ThemeProvider } from "./context/ThemeContext.jsx";

import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";

/* =========================================================
   AUTH
========================================================= */

import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import LoginTwoFactor from "./pages/auth/TwoFactor.jsx";
import VerifyEmail from "./pages/auth/VerifyEmail.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";
import AuthSuccess from "./pages/auth/AuthSuccess.jsx";

/* =========================================================
   CUSTOMER — DASHBOARD
========================================================= */

import Dashboard from "./pages/dashboard/Dashboard.jsx";

/* =========================================================
   CUSTOMER — ACCOUNTS
========================================================= */

import Accounts from "./pages/accounts/Accounts.jsx";
import AccountDetails from "./pages/accounts/AccountDetails.jsx";
import AccountStatement from "./pages/accounts/AccountStatement.jsx";
import OpenAccount from "./pages/accounts/OpenAccount.jsx";

/* =========================================================
   CUSTOMER — WALLET
========================================================= */

import Wallet from "./pages/wallet/Wallet.jsx";
import WalletDetails from "./pages/wallet/WalletDetails.jsx";
import Deposit from "./pages/wallet/Deposit.jsx";
import Withdraw from "./pages/wallet/Withdraw.jsx";
import WalletHistory from "./pages/wallet/WalletHistory.jsx";

/* =========================================================
   CUSTOMER — TRANSFERS
========================================================= */

import Transfers from "./pages/transfers/Transfers.jsx";
import TransferMoney from "./pages/transfers/TransferMoney.jsx";
import InternalTransfer from "./pages/transfers/InternalTransfer.jsx";
import BankTransfer from "./pages/transfers/BankTransfer.jsx";
import BankTransferDetails from "./pages/transfers/BankTransferDetails.jsx";
import InternationalTransfer from "./pages/transfers/InternationalTransfer.jsx";
import Beneficiaries from "./pages/transfers/Beneficiaries.jsx";
import TransferDetails from "./pages/transfers/TransferDetails.jsx";

/* =========================================================
   CUSTOMER — PAYMENTS
========================================================= */

import Payments from "./pages/payments/Payments.jsx";
import PayBill from "./pages/payments/PayBill.jsx";
import PaymentDetails from "./pages/payments/PaymentDetails.jsx";
import PaymentHistory from "./pages/payments/PaymentHistory.jsx";

/* =========================================================
   CUSTOMER — CARDS
========================================================= */

import Cards from "./pages/cards/Cards.jsx";
import CardDetails from "./pages/cards/CardDetails.jsx";
import CreateCard from "./pages/cards/CreateCard.jsx";
import CardTransactions from "./pages/cards/CardTransactions.jsx";

/* =========================================================
   CUSTOMER — LOANS
========================================================= */

import Loans from "./pages/loans/Loans.jsx";
import LoanApplication from "./pages/loans/LoanApplication.jsx";
import LoanDetails from "./pages/loans/LoanDetails.jsx";
import LoanRepayment from "./pages/loans/LoanRepayment.jsx";
import RepaymentSchedule from "./pages/loans/RepaymentSchedule.jsx";

/* =========================================================
   CUSTOMER — SAVINGS
========================================================= */

import Savings from "./pages/savings/Savings.jsx";
import CreateSavings from "./pages/savings/CreateSavings.jsx";
import SavingsDetails from "./pages/savings/SavingsDetails.jsx";
import SavingsHistory from "./pages/savings/SavingsHistory.jsx";

/* =========================================================
   CUSTOMER — INVESTMENTS
========================================================= */

import Investments from "./pages/investments/Investments.jsx";
import InvestmentProducts from "./pages/investments/InvestmentProducts.jsx";
import InvestmentDetails from "./pages/investments/InvestmentDetails.jsx";
import BuyInvestment from "./pages/investments/BuyInvestment.jsx";
import SellInvestment from "./pages/investments/SellInvestment.jsx";
import InvestmentOrders from "./pages/investments/InvestmentOrders.jsx";
import InvestmentHistory from "./pages/investments/InvestmentHistory.jsx";

/* =========================================================
   CUSTOMER — SHARES
========================================================= */

import Shares from "./pages/shares/Shares.jsx";
import ShareDetails from "./pages/shares/ShareDetails.jsx";
import BuyShares from "./pages/shares/BuyShares.jsx";
import SellShares from "./pages/shares/SellShares.jsx";
import ShareOrders from "./pages/shares/ShareOrders.jsx";
import Dividends from "./pages/shares/Dividends.jsx";

/* =========================================================
   CUSTOMER — TRANSACTIONS
========================================================= */

import Transactions from "./pages/transactions/Transactions.jsx";
import TransactionDetails from "./pages/transactions/TransactionDetails.jsx";
import Statements from "./pages/transactions/Statements.jsx";
import ExportTransactions from "./pages/transactions/ExportTransactions.jsx";

/* =========================================================
   CUSTOMER — KYC
========================================================= */

import Kyc from "./pages/kyc/Kyc.jsx";
import KycStart from "./pages/kyc/KycStart.jsx";
import KycDocuments from "./pages/kyc/KycDocuments.jsx";
import KycStatus from "./pages/kyc/KycStatus.jsx";

/* =========================================================
   CUSTOMER — SUPPORT
========================================================= */

import Support from "./pages/support/Support.jsx";
import CreateTicket from "./pages/support/CreateTicket.jsx";
import TicketDetails from "./pages/support/TicketDetails.jsx";
import Faq from "./pages/support/Faq.jsx";

/* =========================================================
   CUSTOMER — SETTINGS
========================================================= */

import Settings from "./pages/settings/Settings.jsx";
import Profile from "./pages/settings/Profile.jsx";
import Security from "./pages/settings/Security.jsx";
import Notifications from "./pages/settings/Notifications.jsx";
import Preferences from "./pages/settings/Preferences.jsx";
import Sessions from "./pages/settings/Sessions.jsx";
import ChangePassword from "./pages/settings/ChangePassword.jsx";
import TwoFactor from "./pages/settings/TwoFactor.jsx";

/* =========================================================
   ADMIN
========================================================= */

import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/admin/Users.jsx";
import AdminUserDetails from "./pages/admin/UserDetails.jsx";
import AdminAccounts from "./pages/admin/Accounts.jsx";
import AdminTransactions from "./pages/admin/Transactions.jsx";
import AdminTransfers from "./pages/admin/Transfers.jsx";
import AdminDeposits from "./pages/admin/Deposits.jsx";
import AdminWithdrawals from "./pages/admin/Withdrawals.jsx";
import AdminLoans from "./pages/admin/Loans.jsx";
import AdminLoanDetails from "./pages/admin/LoanDetails.jsx";
import AdminKycReview from "./pages/admin/KycReview.jsx";
import AdminInvestments from "./pages/admin/Investments.jsx";
import AdminInvestmentDetails from "./pages/admin/InvestmentDetails.jsx";
import AdminShares from "./pages/admin/Shares.jsx";
import AdminCards from "./pages/admin/Cards.jsx";
import AdminSupportTickets from "./pages/admin/SupportTickets.jsx";
import AdminAuditLogs from "./pages/admin/AuditLogs.jsx";
import AdminSystemSettings from "./pages/admin/SystemSettings.jsx";
import AdminOperations from "./pages/admin/Operations.jsx";

/* =========================================================
   SYSTEM / ERROR PAGES
========================================================= */

import NotFound from "./pages/errors/NotFound.jsx";
import Unauthorized from "./pages/errors/Unauthorized.jsx";
import Forbidden from "./pages/errors/Forbidden.jsx";
import ServerError from "./pages/errors/ServerError.jsx";
import Maintenance from "./pages/errors/Maintenance.jsx";

/* =========================================================
   ROLE REDIRECT
========================================================= */

const RoleRedirect = () => {
  try {
    const possibleUserKeys = [
      "user",
      "currentUser",
      "authUser",
      "profile",
    ];

    let user = null;

    for (const key of possibleUserKeys) {
      const raw = localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);

        if (
          parsed &&
          typeof parsed === "object"
        ) {
          user =
            parsed?.user ??
            parsed?.data?.user ??
            parsed?.data ??
            parsed;

          break;
        }
      } catch {
        // Ignore invalid localStorage values.
      }
    }

    const role = String(
      user?.role ??
        user?.userRole ??
        user?.accountRole ??
        "",
    )
      .trim()
      .toUpperCase();

    if (
      [
        "ADMIN",
        "SUPERADMIN",
        "SUPER_ADMIN",
        "STAFF",
        "MANAGER",
      ].includes(role)
    ) {
      return (
        <Navigate
          to="/admin"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  } catch {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }
};

/* =========================================================
   APPLICATION
========================================================= */

const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* =====================================================
              PUBLIC AUTHENTICATION
          ====================================================== */}

          <Route element={<AuthLayout />}>
            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/register"
              element={<Register />}
            />

            <Route
              path="/verify-email"
              element={<VerifyEmail />}
            />

            <Route
              path="/forgot-password"
              element={<ForgotPassword />}
            />

            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />

            <Route
              path="/login/two-factor"
              element={<LoginTwoFactor />}
            />

            <Route
              path="/auth/success"
              element={<AuthSuccess />}
            />
          </Route>

          {/* =====================================================
              CUSTOMER BANKING
          ====================================================== */}

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>

              {/* DASHBOARD */}

              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              {/* ACCOUNTS */}

              <Route
                path="/accounts"
                element={<Accounts />}
              />

              <Route
                path="/accounts/open"
                element={<OpenAccount />}
              />

              <Route
                path="/accounts/:accountId"
                element={<AccountDetails />}
              />

              <Route
                path="/accounts/:accountId/statement"
                element={<AccountStatement />}
              />

              {/* WALLET */}

              <Route
                path="/wallet"
                element={<Wallet />}
              />

              <Route
                path="/wallet/deposit"
                element={<Deposit />}
              />

              <Route
                path="/wallet/withdraw"
                element={<Withdraw />}
              />

              <Route
                path="/wallet/history"
                element={<WalletHistory />}
              />

              <Route
                path="/wallet/:walletId"
                element={<WalletDetails />}
              />

              {/* TRANSFERS */}

              <Route
                path="/transfers"
                element={<Transfers />}
              />

              <Route
                path="/transfers/new"
                element={<TransferMoney />}
              />

              <Route
                path="/transfers/internal"
                element={<InternalTransfer />}
              />

              <Route
                path="/transfers/bank"
                element={<BankTransfer />}
              />

              <Route
                path="/transfers/international"
                element={<InternationalTransfer />}
              />

              <Route
                path="/transfers/beneficiaries"
                element={<Beneficiaries />}
              />

              <Route
                path="/transfers/bank/:transferId"
                element={<BankTransferDetails />}
              />

              <Route
                path="/transfers/:transferId"
                element={<TransferDetails />}
              />

              {/* PAYMENTS */}

              <Route
                path="/payments"
                element={<Payments />}
              />

              <Route
                path="/payments/pay-bill"
                element={<PayBill />}
              />

              <Route
                path="/payments/history"
                element={<PaymentHistory />}
              />

              <Route
                path="/payments/:paymentId"
                element={<PaymentDetails />}
              />

              {/* CARDS */}

              <Route
                path="/cards"
                element={<Cards />}
              />

              <Route
                path="/cards/create"
                element={<CreateCard />}
              />

              <Route
                path="/cards/:cardId/transactions"
                element={<CardTransactions />}
              />

              <Route
                path="/cards/:cardId"
                element={<CardDetails />}
              />

              {/* LOANS */}

              <Route
                path="/loans"
                element={<Loans />}
              />

              <Route
                path="/loans/apply"
                element={<LoanApplication />}
              />

              <Route
                path="/loans/:loanId/repay"
                element={<LoanRepayment />}
              />

              <Route
                path="/loans/:loanId/schedule"
                element={<RepaymentSchedule />}
              />

              <Route
                path="/loans/:loanId"
                element={<LoanDetails />}
              />

              {/* SAVINGS */}

              <Route
                path="/savings"
                element={<Savings />}
              />

              <Route
                path="/savings/create"
                element={<CreateSavings />}
              />

              <Route
                path="/savings/history"
                element={<SavingsHistory />}
              />

              <Route
                path="/savings/:savingsId"
                element={<SavingsDetails />}
              />

              {/* INVESTMENTS */}

              <Route
                path="/investments"
                element={<Investments />}
              />

              <Route
                path="/investments/products"
                element={<InvestmentProducts />}
              />

              <Route
                path="/investments/orders"
                element={<InvestmentOrders />}
              />

              <Route
                path="/investments/history"
                element={<InvestmentHistory />}
              />

              <Route
                path="/investments/buy"
                element={<BuyInvestment />}
              />

              <Route
                path="/investments/sell"
                element={<SellInvestment />}
              />

              <Route
                path="/investments/:investmentId"
                element={<InvestmentDetails />}
              />

              {/* SHARES */}

              <Route
                path="/shares"
                element={<Shares />}
              />

              <Route
                path="/shares/buy"
                element={<BuyShares />}
              />

              <Route
                path="/shares/sell"
                element={<SellShares />}
              />

              <Route
                path="/shares/orders"
                element={<ShareOrders />}
              />

              <Route
                path="/shares/dividends"
                element={<Dividends />}
              />

              <Route
                path="/shares/:shareId"
                element={<ShareDetails />}
              />

              {/* TRANSACTIONS */}

              <Route
                path="/transactions"
                element={<Transactions />}
              />

              <Route
                path="/transactions/statements"
                element={<Statements />}
              />

              <Route
                path="/transactions/export"
                element={<ExportTransactions />}
              />

              <Route
                path="/transactions/:transactionId"
                element={<TransactionDetails />}
              />

              {/* KYC */}

              <Route
                path="/kyc"
                element={<Kyc />}
              />

              <Route
                path="/kyc/start"
                element={<KycStart />}
              />

              <Route
                path="/kyc/documents"
                element={<KycDocuments />}
              />

              <Route
                path="/kyc/status"
                element={<KycStatus />}
              />

              {/* SUPPORT */}

              <Route
                path="/support"
                element={<Support />}
              />

              <Route
                path="/support/create"
                element={<CreateTicket />}
              />

              <Route
                path="/support/faq"
                element={<Faq />}
              />

              <Route
                path="/support/tickets/:ticketId"
                element={<TicketDetails />}
              />

              <Route
                path="/support/:ticketId"
                element={<TicketDetails />}
              />

              {/* CUSTOMER SETTINGS */}

              <Route
                path="/settings"
                element={<Settings />}
              />

              <Route
                path="/settings/profile"
                element={<Profile />}
              />

              <Route
                path="/settings/security"
                element={<Security />}
              />

              <Route
                path="/settings/notifications"
                element={<Notifications />}
              />

              <Route
                path="/settings/preferences"
                element={<Preferences />}
              />

              <Route
                path="/settings/sessions"
                element={<Sessions />}
              />

              <Route
                path="/settings/change-password"
                element={<ChangePassword />}
              />

              <Route
                path="/two-factor"
                element={<TwoFactor />}
              />
            </Route>
          </Route>

          {/* =====================================================
              ADMINISTRATION
          ====================================================== */}

          <Route
            element={
              <ProtectedRoute
                requireAdmin
              />
            }
          >
            <Route element={<AdminLayout />}>

              {/* ADMIN DASHBOARD */}

              <Route
                path="/admin"
                element={<AdminDashboard />}
              />

              <Route
                path="/admin/dashboard"
                element={<AdminDashboard />}
              />

              {/* CUSTOMERS */}

              <Route
                path="/admin/customers"
                element={<AdminUsers />}
              />

              <Route
                path="/admin/customers/:userId"
                element={<AdminUserDetails />}
              />

              <Route
                path="/admin/users"
                element={<AdminUsers />}
              />

              <Route
                path="/admin/users/:userId"
                element={<AdminUserDetails />}
              />

              {/* ACCOUNTS */}

              <Route
                path="/admin/accounts"
                element={<AdminAccounts />}
              />

              {/* TRANSACTIONS */}

              <Route
                path="/admin/transactions"
                element={<AdminTransactions />}
              />

              {/* TRANSFERS */}

              <Route
                path="/admin/transfers"
                element={<AdminTransfers />}
              />

              {/* DEPOSITS */}

              <Route
                path="/admin/deposits"
                element={<AdminDeposits />}
              />

              {/* WITHDRAWALS */}

              <Route
                path="/admin/withdrawals"
                element={<AdminWithdrawals />}
              />

              {/* LOANS */}

              <Route
                path="/admin/loans"
                element={<AdminLoans />}
              />

              <Route
                path="/admin/loans/:loanId"
                element={<AdminLoanDetails />}
              />

              {/* KYC */}

              <Route
                path="/admin/kyc"
                element={<AdminKycReview />}
              />

              <Route
                path="/admin/kyc/:kycId"
                element={<AdminKycReview />}
              />

              {/* INVESTMENTS */}

              <Route
                path="/admin/investments"
                element={<AdminInvestments />}
              />

              <Route
                path="/admin/investments/:investmentId"
                element={<AdminInvestmentDetails />}
              />

              {/* SHARES */}

              <Route
                path="/admin/shares"
                element={<AdminShares />}
              />

              {/* CARDS */}

              <Route
                path="/admin/cards"
                element={<AdminCards />}
              />

              {/* SUPPORT */}

              <Route
                path="/admin/support/tickets"
                element={<AdminSupportTickets />}
              />

              <Route
                path="/admin/support"
                element={<AdminSupportTickets />}
              />

              {/* OPERATIONS */}

              <Route
                path="/admin/operations"
                element={<AdminOperations />}
              />

              {/* AUDIT */}

              <Route
                path="/admin/audit-logs"
                element={<AdminAuditLogs />}
              />

              {/* SYSTEM SETTINGS */}

              <Route
                path="/admin/system-settings"
                element={<AdminSystemSettings />}
              />

              {/* Alias used by admin navigation/settings links */}

              <Route
                path="/admin/settings"
                element={<AdminSystemSettings />}
              />
            </Route>
          </Route>

          {/* =====================================================
              SYSTEM ROUTES
          ====================================================== */}

          <Route
            path="/unauthorized"
            element={<Unauthorized />}
          />

          <Route
            path="/forbidden"
            element={<Forbidden />}
          />

          <Route
            path="/server-error"
            element={<ServerError />}
          />

          <Route
            path="/maintenance"
            element={<Maintenance />}
          />

          {/* =====================================================
              ROOT
          ====================================================== */}

          <Route
            path="/"
            element={<RoleRedirect />}
          />

          {/* =====================================================
              404
          ====================================================== */}

          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;