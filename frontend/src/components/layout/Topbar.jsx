import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../hooks/useAuth.js";

import {
  APP_CONFIG,
  ROUTES,
} from "../../utils/constants.js";

/* =========================================================
   PAGE TITLES
========================================================= */

const PAGE_TITLES = {
  [ROUTES.DASHBOARD]:
    "Dashboard",

  [ROUTES.ACCOUNTS]:
    "Accounts",

  [ROUTES.WALLET]:
    "Wallet",

  [ROUTES.TRANSFERS]:
    "Transfers",

  [ROUTES.PAYMENTS]:
    "Payments",

  [ROUTES.CARDS]:
    "Cards",

  [ROUTES.LOANS]:
    "Loans",

  [ROUTES.SAVINGS]:
    "Savings",

  [ROUTES.INVESTMENTS]:
    "Investments",

  [ROUTES.SHARES]:
    "Shares",

  [ROUTES.TRANSACTIONS]:
    "Transactions",

  [ROUTES.KYC]:
    "Identity verification",

  [ROUTES.SUPPORT]:
    "Support",

  [ROUTES.SETTINGS]:
    "Settings",
};

/* =========================================================
   TOPBAR
========================================================= */

const Topbar = ({
  adminMode = false,
}) => {
  const {
    user,
    isAdmin,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();

  const profileMenuRef =
    useRef(null);

  const [profileOpen, setProfileOpen] =
    useState(false);

  /* =======================================================
     USER DETAILS
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

  const initials =
    `${firstName.charAt(0)}${
      lastName.charAt(0) || ""
    }`.toUpperCase();

  /* =======================================================
     PAGE TITLE
     
     Supports both exact routes and nested routes.
     
     Example:
       /accounts
       /accounts/123
       /accounts/123/statement
     
     will still display "Accounts".
  ======================================================= */

  const getPageTitle = () => {
    const exactTitle =
      PAGE_TITLES[
        location.pathname
      ];

    if (exactTitle) {
      return exactTitle;
    }

    const matchingRoute =
      Object.entries(PAGE_TITLES)
        .filter(
          ([path]) =>
            path !== "/" &&
            location.pathname.startsWith(
              `${path}/`,
            ),
        )
        .sort(
          (
            [firstPath],
            [secondPath],
          ) =>
            secondPath.length -
            firstPath.length,
        )[0];

    if (matchingRoute) {
      return matchingRoute[1];
    }

    if (adminMode) {
      return "Administration";
    }

    return APP_CONFIG.name ||
      "Epex Bank";
  };

  const title =
    getPageTitle();

  /* =======================================================
     MOBILE NAVIGATION
  ======================================================= */

  const openMobileNavigation = () => {
    window.dispatchEvent(
      new CustomEvent(
        "epex:open-mobile-nav",
      ),
    );
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    setProfileOpen(false);

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
     PROFILE MENU — OUTSIDE CLICK
  ======================================================= */

  useEffect(() => {
    if (!profileOpen) {
      return undefined;
    }

    const handlePointerDown = (
      event,
    ) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(
          event.target,
        )
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );
    };
  }, [profileOpen]);

  /* =======================================================
     PROFILE MENU — ESCAPE KEY
  ======================================================= */

  useEffect(() => {
    if (!profileOpen) {
      return undefined;
    }

    const handleKeyDown = (
      event,
    ) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [profileOpen]);

  /* =======================================================
     CLOSE PROFILE MENU ON ROUTE CHANGE
  ======================================================= */

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <header
      className="
        sticky
        top-0
        z-30
        border-b
        border-slate-200
        bg-white/95
        backdrop-blur-xl
      "
    >
      <div
        className="
          flex
          min-h-16
          items-center
          justify-between
          gap-3
          px-4
          sm:px-6
          lg:px-8
        "
      >
        {/* =================================================
            LEFT
        ================================================== */}

        <div
          className="
            flex
            min-w-0
            items-center
            gap-3
          "
        >
          {/* Mobile navigation */}

          <button
            type="button"
            onClick={
              openMobileNavigation
            }
            className="
              rounded-xl
              p-2
              text-slate-600
              transition
              hover:bg-slate-100
              hover:text-slate-950
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-slate-400
              lg:hidden
            "
            aria-label="Open navigation"
          >
            <Menu
              className="h-5 w-5"
              aria-hidden="true"
            />
          </button>

          <div className="min-w-0">
            <h1
              className="
                truncate
                text-base
                font-bold
                text-slate-950
                sm:text-lg
              "
            >
              {title}
            </h1>

            <p
              className="
                hidden
                text-xs
                text-slate-400
                sm:block
              "
            >
              {adminMode
                ? "Epex Bank administration"
                : "Secure banking for your everyday finances"}
            </p>
          </div>
        </div>

        {/* =================================================
            RIGHT
        ================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            gap-2
            sm:gap-3
          "
        >
          {/* Secure session */}

          <div
            className="
              hidden
              items-center
              gap-2
              rounded-full
              border
              border-emerald-100
              bg-emerald-50
              px-3
              py-1.5
              text-xs
              font-semibold
              text-emerald-700
              md:flex
            "
          >
            <ShieldCheck
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />

            <span>
              Secure session
            </span>
          </div>

          {/* Notifications */}

          <button
            type="button"
            onClick={() => {
              navigate(
                `${ROUTES.SETTINGS}/notifications`,
              );
            }}
            className="
              relative
              rounded-xl
              p-2.5
              text-slate-500
              transition
              hover:bg-slate-100
              hover:text-slate-950
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-slate-400
            "
            aria-label="Open notifications"
          >
            <Bell
              className="h-5 w-5"
              aria-hidden="true"
            />

            {/* Notification indicator */}

            <span
              className="
                absolute
                right-2
                top-2
                h-2
                w-2
                rounded-full
                bg-blue-600
                ring-2
                ring-white
              "
              aria-hidden="true"
            />
          </button>

          {/* =================================================
              PROFILE MENU
          ================================================== */}

          <div
            ref={profileMenuRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() =>
                setProfileOpen(
                  (value) =>
                    !value,
                )
              }
              className="
                flex
                items-center
                gap-2
                rounded-xl
                p-1.5
                transition
                hover:bg-slate-100
                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-slate-400
              "
              aria-expanded={
                profileOpen
              }
              aria-haspopup="menu"
              aria-label="Open account menu"
            >
              {/* Avatar */}

              <span
                className="
                  flex
                  h-9
                  w-9
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
              </span>

              {/* Name */}

              <span
                className="
                  hidden
                  max-w-36
                  text-left
                  sm:block
                "
              >
                <span
                  className="
                    block
                    truncate
                    text-sm
                    font-semibold
                    text-slate-900
                  "
                >
                  {firstName}{" "}
                  {lastName}
                </span>

                <span
                  className="
                    block
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  {user?.role ||
                    "Customer"}
                </span>
              </span>

              <ChevronDown
                className={[
                  "hidden h-4 w-4 text-slate-400 transition sm:block",
                  profileOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
                aria-hidden="true"
              />
            </button>

            {/* =================================================
                PROFILE DROPDOWN
            ================================================== */}

            {profileOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-full
                  mt-2
                  w-[min(18rem,calc(100vw-2rem))]
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-2
                  shadow-2xl
                "
                role="menu"
              >
                {/* User information */}

                <div
                  className="
                    border-b
                    border-slate-100
                    px-3
                    py-3
                  "
                >
                  <p
                    className="
                      truncate
                      text-sm
                      font-semibold
                      text-slate-900
                    "
                  >
                    {firstName}{" "}
                    {lastName}
                  </p>

                  <p
                    className="
                      mt-1
                      truncate
                      text-xs
                      text-slate-400
                    "
                  >
                    {user?.email ||
                      "Epex Bank customer"}
                  </p>
                </div>

                {/* Profile */}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(
                      false,
                    );

                    navigate(
                      `${ROUTES.SETTINGS}/profile`,
                    );
                  }}
                  className="
                    mt-1
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-left
                    text-sm
                    font-medium
                    text-slate-600
                    transition
                    hover:bg-slate-100
                    hover:text-slate-950
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-slate-400
                  "
                >
                  <UserRound
                    className="h-4 w-4"
                    aria-hidden="true"
                  />

                  <span>
                    Profile
                  </span>
                </button>

                {/* Settings */}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(
                      false,
                    );

                    navigate(
                      ROUTES.SETTINGS,
                    );
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-left
                    text-sm
                    font-medium
                    text-slate-600
                    transition
                    hover:bg-slate-100
                    hover:text-slate-950
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-slate-400
                  "
                >
                  <Settings
                    className="h-4 w-4"
                    aria-hidden="true"
                  />

                  <span>
                    Settings
                  </span>
                </button>

                {/* Admin */}

                {isAdmin && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(
                        false,
                      );

                      navigate(
                        ROUTES.ADMIN,
                      );
                    }}
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-xl
                      px-3
                      py-2.5
                      text-left
                      text-sm
                      font-medium
                      text-slate-600
                      transition
                      hover:bg-blue-50
                      hover:text-blue-700
                      focus:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-blue-400
                    "
                  >
                    <ShieldCheck
                      className="h-4 w-4"
                      aria-hidden="true"
                    />

                    <span>
                      Administration
                    </span>
                  </button>
                )}

                {/* Logout */}

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={
                    handleLogout
                  }
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-left
                    text-sm
                    font-medium
                    text-red-600
                    transition
                    hover:bg-red-50
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-red-400
                  "
                >
                  <LogOut
                    className="h-4 w-4"
                    aria-hidden="true"
                  />

                  <span>
                    Sign out
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;