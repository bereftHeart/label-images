import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId: import.meta.env.COGNITO_USER_POOL_CLIENT_ID,
      userPoolId: import.meta.env.COGNITO_USER_POOL_ID,
    },
  },
  API: {
    REST: {
      ApiEndpoint: {
        endpoint: import.meta.env.API_ENDPOINT,
      },
    },
  },
  Storage: {
    S3: {
      bucket: import.meta.env.S3_BUCKET,
    },
  },
});
