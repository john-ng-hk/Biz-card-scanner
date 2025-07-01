#!/bin/bash

# Retrieve CloudFormation outputs
outputs=$(aws cloudformation describe-stacks --stack-name sam-business-card-scanner --query "Stacks[0].Outputs" --region ap-southeast-1)

# Extract outputs
frontendBucket=$(echo $outputs | jq -r '.[] | select(.OutputKey=="FrontendBucketName") | .OutputValue')
backendBucket=$(echo $outputs | jq -r '.[] | select(.OutputKey=="BackendBucketName") | .OutputValue')

# Delete all objects in the bucket first
aws s3 rm s3://$frontendBucket --recursive
aws s3 rm s3://$backendBucket --recursive

# Delete stack
sam delete