import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { APIGatewayProxyEvent } from "aws-lambda";
import { response } from "../utils/response";

const cognito = new CognitoIdentityProviderClient({
  region: process.env.CDK_DEFAULT_REGION || "ap-east-1",
});

const CLIENT_ID = process.env.CLIENT_ID!;

/*
 * Create a new user
 */
export const createUser = async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return response(400, "Missing request body");
  }
  try {
    const { email, password, clientId } = JSON.parse(event.body);
    if (!email || !password || !clientId) {
      return response(400, "Missing required fields");
    }

    if (clientId !== CLIENT_ID) {
      return response(400, "Invalid client ID");
    }

    const command = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    });

    await cognito.send(command);

    return response(
      200,
      "User created successfully. Please verify your email.",
    );
  } catch (error: any) {
    if (error.name === "UsernameExistsException") {
      return response(409, "User already exists");
    }
    console.error(error);
    return response(400, error?.message || "Failed to create user");
  }
};

/*
 * Verify User (Confirm SignUp)
 */
export const verifyUser = async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return response(400, "Missing request body");
  }
  try {
    const { email, code, clientId } = JSON.parse(event.body);
    if (!email || !code || !clientId) {
      return response(400, "Missing required fields");
    }

    if (clientId !== CLIENT_ID) {
      return response(400, "Invalid client ID");
    }

    const command = new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    });

    await cognito.send(command);

    return response(200, "User verified successfully. You can now log in.");
  } catch (error: any) {
    if (error.name === "CodeMismatchException") {
      return response(400, "Invalid verification code. Please try again.");
    }
    if (error.name === "ExpiredCodeException") {
      return response(400, "Verification code has expired. Request a new one.");
    }
    console.error(error);
    return response(400, error?.message || "Failed to verify user");
  }
};

/*
 * Resend Verification Code
 */
export const resendVerificationCode = async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return response(400, "Missing request body");
  }
  try {
    const { email, clientId } = JSON.parse(event.body);
    if (!email) {
      return response(400, "Missing required fields");
    }

    if (clientId !== CLIENT_ID) {
      return response(400, "Invalid client ID");
    }

    const command = new ResendConfirmationCodeCommand({
      ClientId: CLIENT_ID,
      Username: email,
    });

    await cognito.send(command);

    return response(200, "Verification code resent successfully.");
  } catch (error: any) {
    console.error(error);
    return response(
      400,
      error?.message || "Failed to resend verification code",
    );
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
    const { email, password, clientId } = JSON.parse(event.body);
    if (!email || !password || !clientId) {
      return response(400, "Missing required fields");
    }

    if (clientId !== CLIENT_ID) {
      return response(400, "Invalid client ID");
    }

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: { USERNAME: email, PASSWORD: password },
      ClientId: CLIENT_ID,
    });

    const res = await cognito.send(command);

    if (!res.AuthenticationResult) {
      throw new Error("Failed to authenticate user");
    }

    return response(200, {
      accessToken: res.AuthenticationResult?.AccessToken,
      idToken: res.AuthenticationResult?.IdToken,
      refreshToken: res.AuthenticationResult?.RefreshToken,
    });
  } catch (error: any) {
    if (error.name === "NotAuthorizedException") {
      return response(401, "Incorrect email or password");
    }
    console.error(error);
    return response(400, "Failed to login user");
  }
};
