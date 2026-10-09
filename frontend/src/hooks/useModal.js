import { useCallback, useState } from "react";

const useModal = (initialOpen = false, initialData = null) => {
  const [isOpen, setIsOpen] = useState(Boolean(initialOpen));
  const [data, setData] = useState(initialData);

  const open = useCallback((nextData = null) => {
    setData(nextData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const updateData = useCallback((nextData) => {
    setData(nextData);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    reset,
    updateData,
  };
};

export default useModal;