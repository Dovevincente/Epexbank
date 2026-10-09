import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

const extractWallet = (payload) => {
  if (!payload) {
    return null;
  }

  if (payload.wallet) {
    return payload.wallet;
  }

  if (payload.data?.wallet) {
    return payload.data.wallet;
  }

  if (payload.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
};

const extractWallets = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.wallets)) {
    return payload.wallets;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.wallets)) {
    return payload.data.wallets;
  }

  const wallet = extractWallet(payload);

  return wallet ? [wallet] : [];
};

const useWallet = (options = {}) => {
  const {
    autoFetch = true,
    enabled = true,
    walletId = "",
  } = options;

  const [wallets, setWallets] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(
    Boolean(autoFetch && enabled),
  );
  const [error, setError] = useState("");

  const fetchWallets = useCallback(async () => {
    if (!enabled) {
      setWallets([]);
      setWallet(null);
      setLoading(false);

      return [];
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get("/wallets");

      const payload = response?.data;

      const nextWallets = extractWallets(payload);

      setWallets(nextWallets);

      const selectedWallet = walletId
        ? nextWallets.find(
            (item) =>
              String(item?.id) === String(walletId),
          ) || null
        : nextWallets[0] || null;

      setWallet(selectedWallet);

      return nextWallets;
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Unable to load wallet information.";

      setError(message);
      setWallets([]);
      setWallet(null);

      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [enabled, walletId]);

  const fetchWallet = useCallback(
    async (id = walletId) => {
      if (!id) {
        const currentWallets = await fetchWallets();
        return currentWallets[0] || null;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          `/wallets/${encodeURIComponent(id)}`,
        );

        const nextWallet = extractWallet(response?.data);

        setWallet(nextWallet);

        if (nextWallet) {
          setWallets((current) => {
            const exists = current.some(
              (item) =>
                String(item?.id) ===
                String(nextWallet?.id),
            );

            if (!exists) {
              return [...current, nextWallet];
            }

            return current.map((item) =>
              String(item?.id) ===
              String(nextWallet?.id)
                ? nextWallet
                : item,
            );
          });
        }

        return nextWallet;
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load wallet information.";

        setError(message);
        throw requestError;
      } finally {
        setLoading(false);
      }
    },
    [fetchWallets, walletId],
  );

  const refresh = useCallback(
    async () => fetchWallets(),
    [fetchWallets],
  );

  const selectWallet = useCallback(
    (id) => {
      if (!id) {
        setWallet(null);
        return null;
      }

      const selected = wallets.find(
        (item) =>
          String(item?.id) === String(id),
      );

      if (selected) {
        setWallet(selected);
      }

      return selected || null;
    },
    [wallets],
  );

  const clear = useCallback(() => {
    setWallets([]);
    setWallet(null);
    setError("");
  }, []);

  const totalBalance = useMemo(
    () =>
      wallets.reduce((total, item) => {
        const value = Number(
          item?.availableBalance ??
            item?.balance ??
            0,
        );

        return total + (Number.isFinite(value) ? value : 0);
      }, 0),
    [wallets],
  );

  useEffect(() => {
    if (!autoFetch || !enabled) {
      setLoading(false);
      return;
    }

    fetchWallets().catch(() => {});
  }, [autoFetch, enabled, fetchWallets]);

  return {
    wallet,
    wallets,

    loading,
    error,

    totalBalance,

    hasWallet: Boolean(wallet),
    hasWallets: wallets.length > 0,

    fetchWallet,
    fetchWallets,
    refresh,
    selectWallet,
    clear,
  };
};

export default useWallet;