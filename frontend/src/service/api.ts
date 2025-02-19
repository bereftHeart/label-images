import { post } from "aws-amplify/api";

const apiName = import.meta.env.API_NAME ?? "";

const loginUser = async (email: string, password: string) => {
  try {
    const response = await post({
      apiName: apiName,
      path: "/login",
      options: {
        body: {
          email,
          password,
        },
      },
    }).response;

    return response;
  } catch (error) {
    console.error("Error logging in:", error);
  }
};

export { loginUser };
