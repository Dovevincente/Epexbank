import api from "./api.js";

export const getCurrentUser = async () => {
  const response = await api.get("/users/me");

  return response.data;
};

export const updateProfile = async (data) => {
  const response = await api.patch(
    "/users/me/profile",
    data,
  );

  return response.data;
};

export const changePassword = async ({
  currentPassword,
  newPassword,
}) => {
  const response = await api.post(
    "/users/me/change-password",
    {
      currentPassword,
      newPassword,
    },
  );

  return response.data;
};

export const getSecuritySessions = async () => {
  const response = await api.get(
    "/users/me/sessions",
  );

  return response.data;
};

export const revokeSecuritySession = async (
  sessionId,
) => {
  const response = await api.delete(
    `/users/me/sessions/${sessionId}`,
  );

  return response.data;
};

export const revokeOtherSessions = async () => {
  const response = await api.delete(
    "/users/me/sessions",
  );

  return response.data;
};

export const updateNotificationPreferences =
  async (data) => {
    const response = await api.patch(
      "/users/me/notification-preferences",
      data,
    );

    return response.data;
  };

export const updatePreferences = async (data) => {
  const response = await api.patch(
    "/users/me/preferences",
    data,
  );

  return response.data;
};