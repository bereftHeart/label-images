import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as dotenv from "dotenv";

dotenv.config();

export class LabelMeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table for storing image metadata
    const imageTable = new dynamodb.Table(this, "ImageTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "ImageTable",
    });

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    // Log group for API Gateway
    const logGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: "/aws/api/label-me",
      retention: logs.RetentionDays.ONE_DAY, // Keep logs for one day
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Remove logs when stack is deleted
    });

    // API Gateway
    const api = new apigateway.RestApi(this, "ImageLabelingApi", {
      restApiName: "Image Labeling API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    // Adding authorizer for API Gateway
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "ImageLabelingAuthorizer",
      {
        cognitoUserPools: [userPool],
        identitySource: "method.request.header.Authorization",
      },
    );

    const authorizationOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // Add CORS headers for 4xx and 5xx responses
    api.addGatewayResponse("GatewayResponse4xx", {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Methods": "'OPTIONS,GET,POST,PUT,DELETE'",
        "Access-Control-Allow-Headers":
          "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
      },
    });

    api.addGatewayResponse("GatewayResponse5xx", {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Methods": "'OPTIONS,GET,POST,PUT,DELETE'",
        "Access-Control-Allow-Headers":
          "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
      },
    });

    // Lambda functions
    const labelImagesFunction = new NodejsFunction(
      this,
      "LabelImagesFunction",
      {
        entry: "src/functions/image.ts",
        handler: "lambdaHandler",
        timeout: cdk.Duration.seconds(10),
        environment: {
          TABLE_NAME: imageTable.tableName,
          CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID!,
          CF_ACCESS_KEY_ID: process.env.CF_ACCESS_KEY_ID!,
          CF_SECRET_ACCESS_KEY: process.env.CF_SECRET_ACCESS_KEY!,
          BUCKET_NAME: process.env.BUCKET_NAME!,
        },
        logRetention: logs.RetentionDays.ONE_DAY,
      },
    );

    const userFunction = new NodejsFunction(this, "UserFunction", {
      entry: "src/functions/user.ts",
      handler: "lambdaHandler",
      environment: {
        CLIENT_ID: userPoolClient.userPoolClientId,
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    // Grant Lambda permissions to write logs
    logGroup.grantWrite(labelImagesFunction);
    logGroup.grantWrite(userFunction);

    // Grant Lambda permissions to access DynamoDB
    imageTable.grantReadWriteData(labelImagesFunction);

    // API endpoints
    const imagesResource = api.root.addResource("label-images");
    const authResource = api.root.addResource("auth");

    const labelImagesIntegration = new apigateway.LambdaIntegration(
      labelImagesFunction,
      {
        proxy: true,
      },
    );

    const userIntegration = new apigateway.LambdaIntegration(userFunction, {
      proxy: true,
    });

    // No auth required for signup, login and fetch images
    authResource.addResource("signup").addMethod("POST", userIntegration);
    authResource.addResource("verify-user").addMethod("POST", userIntegration);
    authResource
      .addResource("resend-verification")
      .addMethod("POST", userIntegration);
    authResource.addResource("login").addMethod("POST", userIntegration);

    imagesResource.addMethod("GET", labelImagesIntegration);

    // Auth required for uploading, fetching external and labeling images
    imagesResource
      .addResource("upload")
      .addMethod("POST", labelImagesIntegration, authorizationOptions);
    imagesResource
      .addResource("confirm-upload")
      .addMethod("POST", labelImagesIntegration, authorizationOptions);
    imagesResource
      .addResource("external")
      .addMethod("POST", labelImagesIntegration, authorizationOptions);
    imagesResource
      .addResource("bulk-upload")
      .addMethod("POST", labelImagesIntegration, authorizationOptions);
    imagesResource
      .addResource("bulk-delete")
      .addMethod("POST", labelImagesIntegration, authorizationOptions);
    imagesResource.addMethod(
      "PUT",
      labelImagesIntegration,
      authorizationOptions,
    );

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.url ?? "Something went wrong with the deployment",
    });
  }
}
