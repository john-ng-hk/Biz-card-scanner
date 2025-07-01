#!/bin/bash

# Build the SAM application
sam build

# Deploy the SAM application
sam deploy

# Update Frontend scripts with Cloudformation Outputs

# Retrieve CloudFormation outputs
outputs=$(aws cloudformation describe-stacks --stack-name biz-card-scanner --query "Stacks[0].Outputs" --region ap-southeast-1)

# Extract outputs
region=$(echo $outputs | jq -r '.[] | select(.OutputKey=="Region") | .OutputValue')
userPoolId=$(echo $outputs | jq -r '.[] | select(.OutputKey=="MainUserpool") | .OutputValue')
clientId=$(echo $outputs | jq -r '.[] | select(.OutputKey=="MainUserpoolClient") | .OutputValue')
identityPoolId=$(echo $outputs | jq -r '.[] | select(.OutputKey=="MainIdentityPool") | .OutputValue')
frontendBucket=$(echo $outputs | jq -r '.[] | select(.OutputKey=="FrontendBucketName") | .OutputValue')
backendBucket=$(echo $outputs | jq -r '.[] | select(.OutputKey=="BackendBucketName") | .OutputValue')
apiGW=$(echo $outputs | jq -r '.[] | select(.OutputKey=="MainAPIGateway") | .OutputValue')
cfid=$(echo $outputs | jq -r '.[] | select(.OutputKey=="MainCloudFrontDistributionId") | .OutputValue')

# Change directory to frontend bucket folder
cd FrontendBucket
# Create a temporary JavaScript file with multiple lines
cat <<EOL > temp.js
const API_URL = '$apiGW';
const poolData = {
    UserPoolId: '$userPoolId',
    ClientId: '$clientId',
};
EOL
# Append the existing JavaScript file to the temporary file
cat script.js >> temp.js
# Replace the original JavaScript file with the temporary file
mv temp.js script.js

# Create a temporary JavaScript file with multiple lines
# cat <<EOL > temp.js
# const backendBucket = '$backendBucket';
# EOL
# # Append the existing JavaScript file to the temporary file
# cat file-upload.js >> temp.js
# # Replace the original JavaScript file with the temporary file
# mv temp.js file-upload.js

# # Create a temporary JavaScript file with multiple lines
# cat <<EOL > temp.js
# const apiGW = '$apiGW';
# EOL

# # Append the existing JavaScript file to the temporary file
# cat additional-info.js >> temp.js

# # Replace the original JavaScript file with the temporary file
# mv temp.js additional-info.js

# Copy the folder content to the S3 bucket
aws s3 cp . s3://$frontendBucket --recursive

# remove the added outputs
sed '1,5d' script.js > temp.js
mv temp.js script.js

# create testUser
aws cognito-idp admin-create-user --username testUser --region $region --user-pool-id $userPoolId
aws cognito-idp admin-set-user-password --user-pool-id $userPoolId --username testUser --password 12345678! --region $region --permanent

# create cloudfront invalidation
aws cloudfront create-invalidation --distribution-id $cfid --paths "/*" --region $region