import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
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
    // const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
    //   websiteIndexDocument: 'index.html',
    //   publicReadAccess: true,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    // });

    // CloudFront distribution for the frontend
    // const distribution = new cloudfront.Distribution(this, 'Distribution', {
    //   defaultBehavior: {
    //     origin: new origins.S3Origin(websiteBucket),
    //   },
    //   additionalBehaviors: {
    //     '/images/*': {
    //       origin: new origins.S3Origin(imageBucket),
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
    });

    // API Gateway
    const api = new apigateway.RestApi(this, "ImageLabelingApi", {
      restApiName: "Image Labeling API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Adding authorizer for API Gateway
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "ImageLabelingAuthorizer",
      {
        cognitoUserPools: [userPool],
      }
    );

    const authorizationOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // Log group for API Gateway
    const logGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: `/aws/api/label-me`,
      retention: logs.RetentionDays.ONE_WEEK, // Keep logs for one week
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Remove logs when stack is deleted
    });

    // Lambda functions
    const labelImagesFunction = new NodejsFunction(
      this,
      "LabelImagesFunction",
      {
        entry: "src/functions/image.ts",
        handler: "lambdaHandler",
        environment: {
          TABLE_NAME: imageTable.tableName,
          BUCKET_NAME: imageBucket.bucketName,
        },
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    const userFunction = new NodejsFunction(this, "UserFunction", {
      entry: "src/functions/user.ts",
      handler: "lambdaHandler",
      environment: {
        CLIENT_ID: userPoolClient.userPoolClientId,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant Lambda permissions to write logs
    logGroup.grantWrite(labelImagesFunction);
    logGroup.grantWrite(userFunction);

    // Grant Lambda permissions to access DynamoDB
    imageTable.grantReadWriteData(labelImagesFunction);

    // Grant Lambda permissions to access S3
    imageBucket.grantReadWrite(labelImagesFunction);

    // API endpoints
    const imagesResource = api.root.addResource("label-images");
    const authResource = api.root.addResource("auth");

    const getImagesIntegration = new apigateway.LambdaIntegration(
      labelImagesFunction
    );

    const userIntegration = new apigateway.LambdaIntegration(userFunction);

    imagesResource.addMethod("GET", getImagesIntegration, authorizationOptions);
    imagesResource
      .addResource("upload")
      .addMethod("POST", getImagesIntegration, authorizationOptions);
    imagesResource
      .addResource("fetch-external")
      .addMethod("POST", getImagesIntegration, authorizationOptions);
    imagesResource.addMethod("PUT", getImagesIntegration, authorizationOptions);

    authResource.addResource("signup").addMethod("POST", userIntegration);
    authResource.addResource("login").addMethod("POST", userIntegration);

    // Deploy frontend
    // new s3deploy.BucketDeployment(this, 'DeployWebsite', {
    //   sources: [s3deploy.Source.asset('./frontend/build')],
    //   destinationBucket: websiteBucket,
    //   distribution,
    //   distributionPaths: ['/*'],
    // });

    // Outputs
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
