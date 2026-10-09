export const getApiErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) => {
  if (!error) {
    return fallback;
  }

  const responseData = error.response?.data;

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (Array.isArray(responseData?.errors)) {
    const messages = responseData.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message,
      )
      .filter(Boolean);

    if (messages.length) {
      return messages.join(". ");
    }
  }

  if (responseData?.errors?.fieldErrors) {
    const messages = Object.values(
      responseData.errors.fieldErrors,
    )
      .flat()
      .filter(Boolean);

    if (messages.length) {
      return messages.join(". ");
    }
  }

  if (error.code === "ECONNABORTED") {
    return "The request took too long. Please check your connection and try again.";
  }

  if (!error.response) {
    return "Unable to connect to Epex Bank. Please check your internet connection.";
  }

  switch (error.response.status) {
    case 400:
      return "The information provided is invalid.";

    case 401:
      return "Your session has expired. Please sign in again.";

    case 403:
      return "You do not have permission to perform this action.";

    case 404:
      return "The requested information could not be found.";

    case 409:
      return "This request conflicts with existing information.";

    case 422:
      return "Some of the information provided could not be processed.";

    case 429:
      return "Too many requests. Please wait a moment and try again.";

    case 500:
    case 502:
    case 503:
    case 504:
      return "Epex Bank is temporarily unable to process this request. Please try again shortly.";

    default:
      return fallback;
  }
};

export const isUnauthorizedError = (error) =>
  error?.response?.status === 401;

export const isForbiddenError = (error) =>
  error?.response?.status === 403;

export const isValidationError = (error) =>
  [400, 422].includes(error?.response?.status);

export const getValidationErrors = (error) => {
  const fieldErrors =
    error?.response?.data?.errors?.fieldErrors;

  return fieldErrors || {};
};