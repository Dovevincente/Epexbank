import { useNotificationContext } from "../context/NotificationContext.jsx";

const useNotifications = () => {
  return useNotificationContext();
};

export default useNotifications;