import {
  processFixedSavingsMaturities,
} from "./savingsMaturityService.js";

const INTERVAL_MS =
  60 * 1000;

let timer = null;
let running = false;

const run = async () => {
  if (running) {
    return;
  }

  running = true;

  try {
    const result =
      await processFixedSavingsMaturities();

    if (result.processed > 0) {
      console.log(
        `[Savings Maturity] Automatically paid ${result.processed} fixed savings account(s).`,
      );
    }
  } catch (error) {
    console.error(
      "[Savings Maturity] Scheduler error:",
      error,
    );
  } finally {
    running = false;
  }
};

export const startSavingsMaturityScheduler =
  () => {
    if (timer) {
      return;
    }

    console.log(
      "[Savings Maturity] Automatic fixed-savings scheduler started.",
    );

    /*
     * Run once immediately when the backend starts.
     */
    void run();

    /*
     * Then check every minute.
     */
    timer = setInterval(
      () => {
        void run();
      },
      INTERVAL_MS,
    );

    timer.unref?.();
  };

export const stopSavingsMaturityScheduler =
  () => {
    if (!timer) {
      return;
    }

    clearInterval(timer);

    timer = null;

    console.log(
      "[Savings Maturity] Automatic fixed-savings scheduler stopped.",
    );
  };
