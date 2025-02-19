import {
  AdminConfirmSignUpCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { APIGatewayProxyEvent } from "aws-lambda";
import { response } from "../utils/response";

const cognito = new CognitoIdentityProviderClient({
  region: process.env.CDK_DEFAULT_REGION || "ap-northeast-1",
});

const CLIENT_ID = process.env.CLIENT_ID!;
const USER_POOL_ID = process.env.USER_POOL_ID!;

/*
 * Create a new user
 */
export const createUser = async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return response(400, "Missing request body");
  }
  try {
    const { email, password } = JSON.parse(event.body);
    if (!email || !password) {
      return response(400, "Missing required fields");
    }

    const command = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    });

    const res = await cognito.send(command);
    if (res.$metadata.httpStatusCode !== 200) {
      throw new Error("Failed to create user");
    }

    // Auto-confirm the user
    await cognito.send(
      new AdminConfirmSignUpCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      })
    );

    return response(200, "User created successfully");
  } catch (error: any) {
    console.error(error);
    return response(400, error?.message || "Failed to create user");
  }
};

/*
 * Login a user
 */
export const loginUser = async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return response(400, "Missing request body");
  }
  try {
    const { email, password } = JSON.parse(event.body);
    if (!email || !password) {
      return response(400, "Missing required fields");
    }

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: { USERNAME: email, PASSWORD: password },
      ClientId: CLIENT_ID,
    });

    const res = await cognito.send(command);

    if (res.$metadata.httpStatusCode !== 200) {
      throw new Error("Failed to login user");
    }

    return response(200, {
      accessToken: res.AuthenticationResult?.AccessToken,
      idToken: res.AuthenticationResult?.IdToken,
      refreshToken: res.AuthenticationResult?.RefreshToken,
    });
  } catch (error: any) {
    console.error(error);
    return response(400, "Failed to login user");
  }
};
