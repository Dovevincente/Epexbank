import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CreditCard,
  FileCheck2,
  Headphones,
  Home,
  Landmark,
  LogOut,
  PiggyBank,
  ReceiptText,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../hooks/useAuth.js";

import {
  APP_CONFIG,
  ROUTES,
} from "../../utils/constants.js";

/* =========================================================
   CUSTOMER NAVIGATION
========================================================= */

const navigationSections = [
  {
    title: "Overview",

    items: [
      {
        label: "Dashboard",
        path: ROUTES.DASHBOARD,
        icon: Home,
      },
      {
        label: "Accounts",
        path: ROUTES.ACCOUNTS,
        icon: Landmark,
      },
      {
        label: "Wallet",
        path: ROUTES.WALLET,
        icon: WalletCards,
      },
    ],
  },

  {
    title: "Money",

    items: [
      {
        label: "Transfers",
        path: ROUTES.TRANSFERS,
        icon: ArrowLeftRight,
      },
      {
        label: "Payments",
        path: ROUTES.PAYMENTS,
        icon: ReceiptText,
      },
      {
        label: "Cards",
        path: ROUTES.CARDS,
        icon: CreditCard,
      },
    ],
  },

  {
    title: "Financial Products",

    items: [
      {
        label: "Loans",
        path: ROUTES.LOANS,
        icon: Banknote,
      },
      {
        label: "Savings",
        path: ROUTES.SAVINGS,
        icon: PiggyBank,
      },
      {
        label: "Investments",
        path: ROUTES.INVESTMENTS,
        icon: BarChart3,
      },
      {
        label: "Shares",
        path: ROUTES.SHARES,
        icon: BriefcaseBusiness,
      },
    ],
  },

  {
    title: "Activity",

    items: [
      {
        label: "Transactions",
        path: ROUTES.TRANSACTIONS,
        icon: ReceiptText,
      },
      {
        label: "KYC",
        path: ROUTES.KYC,
        icon: ShieldCheck,
      },
      {
        label: "Support",
        path: ROUTES.SUPPORT,
        icon: Headphones,
      },
      {
        label: "Settings",
        path: ROUTES.SETTINGS,
        icon: Settings,
      },
    ],
  },
];

/* =========================================================
   ADMIN NAVIGATION
========================================================= */

const adminNavigationSections = [
  {
    title: "Overview",

    items: [
      {
        label: "Dashboard",
        path: "/admin",
        icon: Home,
        end: true,
      },
      {
        label: "Customers",
        path: "/admin/users",
        icon: Users,
      },
      {
        label: "Accounts",
        path: "/admin/accounts",
        icon: Landmark,
      },
    ],
  },

  {
    title: "Banking Operations",

    items: [
      {
        label: "Transactions",
        path: "/admin/transactions",
        icon: Activity,
      },
      {
        label: "Transfers",
        path: "/admin/transfers",
        icon: ArrowLeftRight,
      },
      {
        label: "Deposits",
        path: "/admin/deposits",
        icon: Banknote,
      },
      {
        label: "Withdrawals",
        path: "/admin/withdrawals",
        icon: WalletCards,
      },
    ],
  },

  {
    title: "Lending & Credit",

    items: [
      {
        label: "Loans",
        path: "/admin/loans",
        icon: Landmark,
      },
    ],
  },

  {
    title: "Wealth Management",

    items: [
      {
        label: "Investments",
        path: "/admin/investments",
        icon: BarChart3,
      },
      {
        label: "Shares",
        path: "/admin/shares",
        icon: BriefcaseBusiness,
      },
    ],
  },

  {
    title: "Cards & Payments",

    items: [
      {
        label: "Cards",
        path: "/admin/cards",
        icon: CreditCard,
      },
    ],
  },

  {
    title: "Compliance & Risk",

    items: [
      {
        label: "KYC Review",
        path: "/admin/kyc",
        icon: FileCheck2,
      },
      {
        label: "Audit Logs",
        path: "/admin/audit-logs",
        icon: ShieldCheck,
      },
    ],
  },

  {
    title: "Customer Service",

    items: [
      {
        label: "Support Tickets",
        path: "/admin/support",
        icon: Ticket,
      },
    ],
  },

  {
    title: "System Administration",

    items: [
      {
        label: "System Settings",
        path: "/admin/settings",
        icon: Settings,
      },
      {
        label: "Operations",
        path: "/admin/operations",
        icon: Building2,
      },
    ],
  },
];

/* =========================================================
   SIDEBAR
========================================================= */

const Sidebar = ({
  mobileOpen = false,
  onClose,
  adminMode = false,
}) => {
  const {
    user,
    isAdmin,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  /* =======================================================
     USER NAME
  ======================================================= */

  const firstName =
    user?.profile?.firstName ||
    user?.firstName ||
    user?.email?.split("@")[0] ||
    "Customer";

  const lastName =
    user?.profile?.lastName ||
    user?.lastName ||
    "";

  /* =======================================================
     INITIALS
  ======================================================= */

  const initials =
    `${firstName.charAt(0)}${
      lastName.charAt(0) || ""
    }`.toUpperCase();

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate(
        ROUTES.LOGIN || "/login",
        {
          replace: true,
        },
      );
    }
  };

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const handleNavigation = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  /* =======================================================
     ACTIVE NAVIGATION DATA
  ======================================================= */

  const activeSections = adminMode
    ? adminNavigationSections
    : navigationSections;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* ===================================================
          MOBILE OVERLAY
      ================================================== */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="
            fixed
            inset-0
            z-40
            cursor-default
            bg-slate-950/50
            backdrop-blur-sm
            lg:hidden
          "
          onClick={onClose}
        />
      )}

      {/* ===================================================
          SIDEBAR
      ================================================== */}

      <aside
        aria-label={
          adminMode
            ? "Administration navigation"
            : "Primary navigation"
        }
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:shadow-none",

          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* =================================================
            BRAND
        ================================================= */}

        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <button
            type="button"
            onClick={() => {
              navigate(
                adminMode
                  ? "/admin"
                  : ROUTES.DASHBOARD,
              );

              handleNavigation();
            }}
            className="
              flex
              items-center
              gap-3
              rounded-xl
              text-left
              outline-none
              focus-visible:ring-2
              focus-visible:ring-slate-400
              focus-visible:ring-offset-2
            "
            aria-label={`${APP_CONFIG.name} ${
              adminMode
                ? "administration"
                : "dashboard"
            }`}
          >
            <span
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-slate-950
                text-lg
                font-black
                text-white
                shadow-sm
              "
            >
              E
            </span>

            <span className="min-w-0 text-left">
              <span className="block truncate text-base font-bold tracking-tight text-slate-950">
                {APP_CONFIG.name}
              </span>

              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {adminMode
                  ? "Administration"
                  : "Digital Banking"}
              </span>
            </span>
          </button>

          {/* Mobile close button */}

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-xl
              p-2
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-900
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-slate-400
              lg:hidden
            "
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* =================================================
            USER PROFILE
        ================================================= */}

        <div className="border-b border-slate-100 p-4">
          <button
            type="button"
            onClick={() => {
              navigate(
                adminMode
                  ? "/admin/users"
                  : ROUTES.SETTINGS_PROFILE ||
                    "/settings/profile",
              );

              handleNavigation();
            }}
            className="
              w-full
              rounded-2xl
              bg-slate-50
              p-3
              text-left
              transition
              hover:bg-slate-100
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-slate-400
              focus-visible:ring-offset-2
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-slate-950
                  text-xs
                  font-bold
                  text-white
                "
                aria-hidden="true"
              >
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {firstName}{" "}
                  {lastName}
                </p>

                <p className="truncate text-xs text-slate-500">
                  {user?.email ||
                    "Epex customer"}
                </p>

                {adminMode && (
                  <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    {user?.role ||
                      "Administrator"}
                  </p>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================== */}

        <nav
          className="
            flex-1
            overflow-y-auto
            px-3
            py-5
            overscroll-contain
          "
        >
          {activeSections.map(
            (section) => (
              <div
                key={section.title}
                className="mb-6"
              >
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {section.title}
                </p>

                <div className="space-y-1">
                  {section.items.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.end}
                          onClick={
                            handleNavigation
                          }
                          className={({
                            isActive,
                          }) =>
                            [
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",

                              isActive
                                ? adminMode
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "bg-slate-950 text-white shadow-sm"
                                : adminMode
                                  ? "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                            ].join(" ")
                          }
                        >
                          <Icon
                            className="
                              h-[18px]
                              w-[18px]
                              shrink-0
                            "
                            aria-hidden="true"
                          />

                          <span>
                            {item.label}
                          </span>
                        </NavLink>
                      );
                    },
                  )}
                </div>
              </div>
            ),
          )}

          {/* =================================================
              CUSTOMER ADMINISTRATION SHORTCUT
          ================================================== */}

          {!adminMode && isAdmin && (
            <div className="border-t border-slate-100 pt-5">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Administration
              </p>

              <NavLink
                to="/admin"
                onClick={
                  handleNavigation
                }
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",

                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                  ].join(" ")
                }
              >
                <ShieldCheck
                  className="
                    h-[18px]
                    w-[18px]
                    shrink-0
                  "
                  aria-hidden="true"
                />

                <span>
                  Administration
                </span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* =================================================
            LOGOUT
        ================================================== */}

        <div className="shrink-0 border-t border-slate-100 bg-white p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="
              flex
              w-full
              items-center
              gap-3
              rounded-xl
              px-3
              py-3
              text-sm
              font-medium
              text-slate-600
              transition
              hover:bg-red-50
              hover:text-red-600
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-red-400
              focus-visible:ring-offset-2
            "
          >
            <LogOut
              className="
                h-[18px]
                w-[18px]
              "
              aria-hidden="true"
            />

            <span>
              Sign out
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;