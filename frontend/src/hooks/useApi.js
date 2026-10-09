import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { getApiErrorMessage } from "../utils/error.js";

const useApi = (
  apiFunction,
  {
    immediate = false,
    initialData = null,
  } = {},
) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(...args);

        if (mountedRef.current) {
          setData(result);
        }

        return result;
      } catch (requestError) {
        if (mountedRef.current) {
          setError(requestError);
        }

        throw requestError;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [apiFunction],
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  return {
    data,
    loading,
    error,
    errorMessage: getApiErrorMessage(error),
    execute,
    reset,
    setData,
  };
};

export default useApi;