# Images Labeling App

This is a serverless application for labeling images

## Agenda

1. [AWS CDK Introduction](#1-aws-cdk-introduction)

2. [Prerequisites](#2-prerequisites)

3. [Setup](#3-setup)

## 1. AWS CDK Introduction

[AWS Cloud Development Kit(CDK)](https://aws.amazon.com/cdk) is an open source software development framework to define your cloud application resources using familiar programming languages. After coding using CDK Construct and Stack, if you run it through CDK CLI, it is finally compiled and deployed through AWS CloudFormation.

AWS CDK supports TypeScript, JavaScript, Python, Java, C#/.Net, and (in developer preview) Go. The template codes of this repository are implemented in **TypeScript**, because it clearly defines restrictions on types. Restrictions on types provide automated/powerful guide within IDE.

Because AWS CDK is provided in a language that supports OOP(Object-Oriented Programming), it is possible to configure and deploy cloud resources in the most abstract and modern way. This repository provides a template framework by maximizing these characteristics.

### CDK Useful commands

- `npm install` install dependencies only for Typescript
- `cdk list` list up all stacks
- `cdk deploy` deploy this stack to your default or specific AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
- `cdk destroy` destroy this stack to your default or specific AWS account/region

### CDK Project Entry-point

`cdk.json` in the root directory describes a entry-point file, in this repository we use **infra/app-main.ts** as the entry-point.

### CDK Useful Links

- CDK Intro: [https://docs.aws.amazon.com/cdk/latest/guide/home.html](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- CDK Getting Started: [https://docs.aws.amazon.com/cdk/latest/guide/hello_world.html](https://docs.aws.amazon.com/cdk/latest/guide/hello_world.html)
- API Reference: [https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html)
- CDK Workshop: [https://cdkworkshop.com/](https://cdkworkshop.com/)
- CDK Examples: [https://github.com/aws-samples/aws-cdk-examples](https://github.com/aws-samples/aws-cdk-examples)

## 2. Prerequisites

### AWS Account & IAM User

First of all, AWS Account and IAM User is required. IAM user's credential keys also are requried.

### Dependencies

To execute this app, the following modules must be installed.

- AWS CLI: [aws](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- Node.js: [node](https://nodejs.org/en)
- AWS CDK: [cdk](https://aws.amazon.com/cdk/)

You can install AWS cdk using node command:

```sh
npm i -g aws-cdk
```

And if you are using window, [docker](https://www.docker.com/products/docker-desktop/) is required.

### AWS Credential

Configure your AWS credential keys using AWS CLI.

```bash
aws configure --profile [your-profile]
AWS Access Key ID [None]: xxxxxx
AWS Secret Access Key [None]:yyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
Default region name [None]: us-east-2
Default output format [None]: json
```

If you don't know your account number, execute the following command:

```bash
aws sts get-caller-identity --profile [optional: your-profile]
...
...
{
    "UserId": ".............",
    "Account": "75157*******",
    "Arn": "arn:aws:iam::75157*******:user/[your IAM User ID]"
}
```

## 3. Setup

### Backend - Deployment Guide

#### 📦 Step 1: Build the Application

```sh
cd backend/ & npm i
```

Make the .env file

```sh
cp .env.example .env
```

Config .env file with your account

```
CDK_DEFAULT_ACCOUNT = your-account-id
CDK_DEFAULT_REGION = your-region
CLIENT_ID = your-client-id
USER_POOL_ID = your-user-pool-id
```

---

#### Step 2: Bootstrap CDK

Run the following command to bootstrap your cdk (Only the first time)

```sh
cdk bootstrap
```

Wait for the bootstrap

---

#### Step 3: Deploy your api

```sh
cdk deploy
```

It'll take 2 minutes to deploy your api, after that you can access the api from any where

---

### Frontend - Deployment Guide

## 📦 Step 1: Build the Application

Navigate to your project directory and install dependencies:

```sh
cd frontend & npm i
```

Make the .env file

```sh
cp .env.example .env
```

Config .env file with your api url after deploy the backend

```
VITE_API_BASE_URL = your-api-url
```

Build the project:

```sh
npm run build
```

This will generate a `dist/` folder containing the production-ready files.

---

## ☁️ Step 2: Create an S3 Bucket

Create a new S3 bucket for hosting the frontend

```sh
aws s3 mb s3://your-bucket-name
```

Enable public access for static hosting:

```sh
aws s3api put-public-access-block --bucket your-bucket-name --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

Set the S3 bucket policy for public read access (create a JSON file `s3-policy.json` first):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

Then apply the policy:

```sh
aws s3api put-bucket-policy --bucket your-bucket-name --policy file://s3-policy.json
```

Enable static website hosting:

```sh
aws s3 website s3://your-bucket-name/ --index-document index.html
```

---

## 📤 Step 3: Upload Build Files to S3

Sync the `dist/` folder with your S3 bucket:

```sh
aws s3 sync dist/ s3://your-bucket-name/ -
```

Your app should now be accessible at:

```
http://your-bucket-name.s3-website-us-east-1.amazonaws.com
```

---

## 🌎 Step 4: Configure CloudFront for HTTPS

Create a CloudFront distribution:

```sh
aws cloudfront create-distribution --origin-domain-name your-bucket-name.s3.amazonaws.com
```

This will return a CloudFront **distribution ID** and **URL**. Use this URL for accessing your app with HTTPS.

To force HTTPS, update your CloudFront distribution settings to redirect all HTTP traffic to HTTPS.

---

## 🔄 Step 5: Automate Deployment (Optional)

For faster deployments, add this script to your `package.json`:

```json
"scripts": {
  "deploy": "npm run build && aws s3 sync dist/ s3://your-bucket-name/ --delete"
}
```

Then deploy with:

```sh
npm run deploy
```

---

## 🎉 Done!

Your Image Labeling application is now deployed to **AWS S3**! 🎊

If you encounter any issues, check:

- **AWS S3 Bucket Policy** (Ensure it's publicly readable)
- **CloudFront Cache** (Invalidate the cache if updates are not reflecting)
- **CORS Configuration** (Ensure API requests are allowed)

Enjoy coding! 🚀
