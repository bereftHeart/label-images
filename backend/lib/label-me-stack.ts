import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export class LabelMeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for storing images
    const imageBucket = new s3.Bucket(this, "ImageBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // S3 bucket for hosting the frontend
    // const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
    //   websiteIndexDocument: "index.html",
    //   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    // });

    // // CloudFront distribution for the frontend
    // const distribution = new cloudfront.Distribution(this, "Distribution", {
    //   defaultBehavior: {
    //     origin: origins.S3BucketOrigin.withOriginAccessIdentity(websiteBucket),
    //   },
    //   additionalBehaviors: {
    //     "/images/*": {
    //       origin: origins.S3BucketOrigin.withOriginAccessIdentity(imageBucket),
    //     },
    //   },
    // });

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
      retention: logs.RetentionDays.ONE_WEEK, // Keep logs for one week
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
          BUCKET_NAME: imageBucket.bucketName,
        },
        logRetention: logs.RetentionDays.ONE_WEEK,
      },
    );

    const userFunction = new NodejsFunction(this, "UserFunction", {
      entry: "src/functions/user.ts",
      handler: "lambdaHandler",
      environment: {
        CLIENT_ID: userPoolClient.userPoolClientId,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    const uploadNotificationLambda = new NodejsFunction(
      this,
      "S3UploadTriggerFunction",
      {
        entry: "src/functions/s3UploadTrigger.ts",
        handler: "lambdaHandler",
        environment: {
          TABLE_NAME: imageTable.tableName,
        },
        logRetention: logs.RetentionDays.ONE_WEEK,
      },
    );

    // Grant Lambda permissions to trigger on S3 events
    imageBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new cdk.aws_s3_notifications.LambdaDestination(uploadNotificationLambda),
    );

    // Grant Lambda permissions to write logs
    logGroup.grantWrite(labelImagesFunction);
    logGroup.grantWrite(userFunction);
    logGroup.grantWrite(uploadNotificationLambda);

    // Grant Lambda permissions to access DynamoDB
    imageTable.grantReadWriteData(labelImagesFunction);
    imageTable.grantWriteData(uploadNotificationLambda);

    // Grant Lambda permissions to access S3
    imageBucket.grantReadWrite(labelImagesFunction);
    imageBucket.grantRead(uploadNotificationLambda);

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

    // // Deploy frontend
    // new s3deploy.BucketDeployment(this, "DeployWebsite", {
    //   sources: [s3deploy.Source.asset(".././frontend/dist")],
    //   destinationBucket: websiteBucket,
    //   distribution,
    //   distributionPaths: ["/*"],
    //   metadata: {
    //     VITE_API_BASE_URL: api.url ?? "",
    //     VITE_CLIENT_ID: userPoolClient.userPoolClientId,
    //   },
    // });

    // // Outputs
    // new cdk.CfnOutput(this, "WebsiteURL", {
    //   value: `https://${distribution.distributionDomainName}`,
    // });
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
