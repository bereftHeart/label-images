/**
 * Utility function to create an HTTP response
 */
export const response = (statusCode: number, message: string | object) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*", // Allow all origins
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  },
  body: JSON.stringify(typeof message === "string" ? { message } : message),
});
