import {
  ArrowLeftRight,
  BarChart3,
  Banknote,
  BriefcaseBusiness,
  CreditCard,
  Headphones,
  Home,
  Landmark,
  MoreHorizontal,
  PiggyBank,
  ReceiptText,
  Settings,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import { ROUTES } from "../../utils/constants.js";

/* =========================================================
   MOBILE NAVIGATION
========================================================= */

const MobileNav = () => {
  const navigate = useNavigate();

  const location = useLocation();

  const [moreOpen, setMoreOpen] =
    useState(false);

  /* =======================================================
     MORE MENU ITEMS
  ======================================================= */

  const moreItems = [
    {
      label: "Cards",
      path: ROUTES.CARDS,
      icon: CreditCard,
    },

    {
      label: "Payments",
      path: ROUTES.PAYMENTS,
      icon: ReceiptText,
    },

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
  ];

  /* =======================================================
     ACTIVE MORE STATE
  ======================================================= */

  const isMoreActive =
    moreItems.some(
      (item) =>
        location.pathname ===
          item.path ||
        location.pathname.startsWith(
          `${item.path}/`,
        ),
    );

  /* =======================================================
     CLOSE MORE MENU ON ROUTE CHANGE
  ======================================================= */

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  /* =======================================================
     PREVENT BODY SCROLL WHEN MORE MENU IS OPEN
  ======================================================= */

  useEffect(() => {
    if (!moreOpen) {
      document.body.style.overflow = "";

      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [moreOpen]);

  /* =======================================================
     ESCAPE KEY
  ======================================================= */

  useEffect(() => {
    if (!moreOpen) {
      return undefined;
    }

    const handleKeyDown = (
      event,
    ) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [moreOpen]);

  /* =======================================================
     NAVIGATE FROM MORE
  ======================================================= */

  const navigateFromMore = (
    path,
  ) => {
    setMoreOpen(false);
    navigate(path);
  };

  /* =======================================================
     NAV ITEM CLASS
  ======================================================= */

  const getNavClass = (
    isActive,
    activeClass = "text-slate-950",
  ) =>
    [
      "flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",

      isActive
        ? activeClass
        : "text-slate-400 hover:text-slate-700",
    ].join(" ");

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* ===================================================
          MORE SERVICES SHEET
      ================================================== */}

      {moreOpen && (
        <div
          className="
            fixed
            inset-0
            z-50
            bg-slate-950/50
            backdrop-blur-sm
            lg:hidden
          "
          role="presentation"
          onClick={() =>
            setMoreOpen(false)
          }
        >
          <div
            className="
              absolute
              inset-x-0
              bottom-0
              max-h-[80vh]
              overflow-y-auto
              overscroll-contain
              rounded-t-3xl
              bg-white
              p-5
              pb-[calc(1.25rem+env(safe-area-inset-bottom))]
              shadow-2xl
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-services-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Header */}

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2
                  id="mobile-services-title"
                  className="text-lg font-bold text-slate-950"
                >
                  Banking services
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Access your Epex Bank services
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMoreOpen(false)
                }
                className="
                  rounded-xl
                  bg-slate-100
                  p-2
                  text-slate-500
                  transition
                  hover:bg-slate-200
                  hover:text-slate-900
                  focus:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-slate-400
                "
                aria-label="Close services"
              >
                <X
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Services */}

            <div className="grid grid-cols-2 gap-3">
              {moreItems.map(
                (item) => {
                  const Icon =
                    item.icon;

                  const active =
                    location.pathname ===
                      item.path ||
                    location.pathname.startsWith(
                      `${item.path}/`,
                    );

                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() =>
                        navigateFromMore(
                          item.path,
                        )
                      }
                      className={[
                        "flex items-center gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",

                        active
                          ? "border-slate-200 bg-slate-950 text-white"
                          : "border-slate-100 bg-slate-50 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",

                          active
                            ? "bg-white/10 text-white"
                            : "bg-white text-slate-700",
                        ].join(" ")}
                      >
                        <Icon
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      </span>

                      <span
                        className={[
                          "text-sm font-semibold",

                          active
                            ? "text-white"
                            : "text-slate-800",
                        ].join(" ")}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MOBILE BOTTOM NAVIGATION
      ================================================== */}

      <nav
        className="
          fixed
          inset-x-0
          bottom-0
          z-40
          border-t
          border-slate-200
          bg-white/95
          px-2
          pb-[env(safe-area-inset-bottom)]
          shadow-[0_-8px_30px_rgba(15,23,42,0.06)]
          backdrop-blur-xl
          lg:hidden
        "
        aria-label="Mobile navigation"
      >
        <div
          className="
            mx-auto
            grid
            h-16
            max-w-xl
            grid-cols-5
          "
        >
          {/* Home */}

          <NavLink
            to={ROUTES.DASHBOARD}
            className={({ isActive }) =>
              getNavClass(
                isActive,
              )
            }
            aria-label="Dashboard"
          >
            <Home
              className="h-5 w-5"
              aria-hidden="true"
            />

            <span>
              Home
            </span>
          </NavLink>

          {/* Accounts */}

          <NavLink
            to={ROUTES.ACCOUNTS}
            className={({ isActive }) =>
              getNavClass(
                isActive,
              )
            }
            aria-label="Accounts"
          >
            <Landmark
              className="h-5 w-5"
              aria-hidden="true"
            />

            <span>
              Accounts
            </span>
          </NavLink>

          {/* Transfer */}

          <NavLink
            to={ROUTES.TRANSFERS}
            className={({ isActive }) =>
              getNavClass(
                isActive,
                "text-blue-600",
              )
            }
            aria-label="Transfer money"
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    "-mt-5 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-xl ring-4 ring-white transition",

                    isActive
                      ? "bg-blue-600"
                      : "bg-slate-950",
                  ].join(" ")}
                >
                  <ArrowLeftRight
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </span>

                <span className="-mt-1">
                  Transfer
                </span>
              </>
            )}
          </NavLink>

          {/* Wallet */}

          <NavLink
            to={ROUTES.WALLET}
            className={({ isActive }) =>
              getNavClass(
                isActive,
              )
            }
            aria-label="Wallet"
          >
            <WalletCards
              className="h-5 w-5"
              aria-hidden="true"
            />

            <span>
              Wallet
            </span>
          </NavLink>

          {/* More */}

          <button
            type="button"
            onClick={() =>
              setMoreOpen(true)
            }
            className={[
              getNavClass(
                isMoreActive,
              ),
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
            ].join(" ")}
            aria-label="More banking services"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal
              className="h-5 w-5"
              aria-hidden="true"
            />

            <span>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;