import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
  useLocation,
} from "react-router-dom";

import Sidebar from "../components/layout/Sidebar.jsx";
import Topbar from "../components/layout/Topbar.jsx";
import MobileNav from "../components/layout/MobileNav.jsx";

/* =========================================================
   DASHBOARD LAYOUT
========================================================= */

const DashboardLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  const location = useLocation();

  /* =======================================================
     OPEN MOBILE SIDEBAR
     
     Allows Topbar/mobile controls to open the
     sidebar without creating unnecessary prop
     dependencies between components.
  ======================================================= */

  useEffect(() => {
    const handleOpenSidebar = () => {
      setMobileSidebarOpen(true);
    };

    window.addEventListener(
      "epex:open-mobile-nav",
      handleOpenSidebar,
    );

    return () => {
      window.removeEventListener(
        "epex:open-mobile-nav",
        handleOpenSidebar,
      );
    };
  }, []);

  /* =======================================================
     CLOSE MOBILE SIDEBAR WHEN ROUTE CHANGES
     
     This prevents the mobile drawer from remaining
     open after navigating to another banking page.
  ======================================================= */

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  /* =======================================================
     PREVENT BODY SCROLL WHEN MOBILE SIDEBAR IS OPEN
  ======================================================= */

  useEffect(() => {
    if (!mobileSidebarOpen) {
      document.body.style.overflow = "";

      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [mobileSidebarOpen]);

  /* =======================================================
     ESCAPE KEY
     
     Allows users to close the mobile sidebar using
     the Escape key.
  ======================================================= */

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
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
  }, [mobileSidebarOpen]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ===================================================
          SIDEBAR
      ================================================== */}

      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() =>
          setMobileSidebarOpen(false)
        }
      />

      {/* ===================================================
          MAIN APPLICATION AREA
      ================================================== */}

      <div className="min-h-screen lg:pl-72">
        <Topbar />

        <main
          className="
            min-w-0
            px-4
            pb-24
            pt-5
            sm:px-6
            lg:px-8
            lg:pb-8
          "
        >
          <div
            className="
              mx-auto
              w-full
              max-w-[1600px]
            "
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* ===================================================
          MOBILE BOTTOM NAVIGATION
      ================================================== */}

      <MobileNav />
    </div>
  );
};

export default DashboardLayout;