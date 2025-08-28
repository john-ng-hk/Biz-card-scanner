# Business Card Scanner: Digitize and Analyze Your Professional Network with AI

The Business Card Scanner is a web application that transforms physical business cards into organized digital contacts using AI-powered text extraction and analysis. It helps professionals efficiently manage their network by automatically extracting contact information, categorizing companies by industry, and providing network intelligence through interactive visualizations.

The application combines AWS services with the DeepSeek API to deliver a comprehensive contact management solution. Key features include:
- Automated information extraction from business card images using Amazon Textract and DeepSeek AI (or other AI)
- Secure user authentication and data storage with AWS Cognito and DynamoDB
- Interactive network analysis dashboard showing company connections and industry insights
- Quickly download contacts and integrate with your local mobile contact book
- Real-time chat interface for querying contact information and network analytics
- Responsive web interface with advanced filtering, sorting, and search capabilities

## Quick Start
1. Click this demo [url](https://card.cmpapp.top)
2. Sign in using the test credentials:
   - Username: testUser
   - Password: 12345678!
3. Navigate to the "Scan Cards" tab
4. Upload one or more business card images
![upload-success](docs/upload-success.png)
5. View processed contacts in the "My Contacts" tab
![cards](docs/cards.png)
6. Explore network insights in the "Network Analysis" tab
![dashboard](docs/dashboard-network.png)
![dashboard](docs/dashboard-charts.png)
7. Ask your AI Assistant to analyze your professional network!
![ai](docs/deepseek-test.png)
   
## Repository Structure
```
.
├── application/                  # Backend Lambda function code
│   ├── app.py                   # Main application logic for API endpoints
│   └── requirements.txt         # Python dependencies
├── FrontendBucket/             # Frontend web application assets
│   ├── index.html              # Main HTML structure
│   ├── script.js               # Frontend JavaScript functionality
│   └── styles.css              # CSS styling
├── events/                     # Test event templates
│   └── event.json             # Sample API Gateway event
├── template.yaml              # AWS SAM infrastructure definition
├── samconfig.toml            # SAM CLI configuration
├── deploy.sh                 # Deployment automation script
└── delete.sh                 # Resource cleanup script
```

## Usage Instructions
### Prerequisites
- AWS CLI installed and configured with appropriate credentials
- AWS SAM CLI installed
- Python 3.13 or later
- DeepSeek API key

### Installation

1. Clone the repository and navigate to the project directory:
```bash
git clone <repository-url>
cd business-card-scanner
```
2. Install Python dependencies:
```bash
cd application
pip install -r requirements.txt
cd ..
```
3. Update the `Parameters` section in `template.yaml`, including your domain name, ACM ssl cert arn, and deepseek api key
4. Go to AWS Console, find the service `Amazon API Gateway`, request increase for `Maximum integration timeout in milliseconds` to 60000, it's a small increase so usually the request will be approved automatically by AWS
5. Deploy the application:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Troubleshooting

#### Common Issues

1. Image Upload Failures
- Error: "Failed to upload image"
- Solution: 
  ```bash
  # Check S3 bucket permissions
  aws s3api get-bucket-policy --bucket <backend-bucket-name>
  ```

2. Contact Processing Timeout
- Error: "Lambda function timed out"
- Solution: Increase Lambda timeout in template.yaml:
  ```yaml
  Globals:
    Function:
      Timeout: 900
  ```

3. Authentication Issues
- Error: "User is not authorized"
- Solution:
  ```bash
  # Verify Cognito user status
  aws cognito-idp admin-get-user \
    --user-pool-id <user-pool-id> \
    --username testUser
  ```

## Data Flow
The application processes business card data through a multi-stage pipeline that extracts, analyzes, and stores contact information.

```ascii
[Business Card Image] -> [Amazon Textract] -> [DeepSeek API] -> [DynamoDB]
           |                    |                   |               |
           v                    v                   v               v
    Image Storage     Text Extraction    Contact Info Parse    Data Storage
    (S3 Backend)                         & Classification
```

Key Component Interactions:
1. Frontend uploads business card images to S3 backend bucket
2. Lambda function triggers Textract for OCR processing
3. Extracted text is sent to DeepSeek API for structured data extraction
4. Parsed contact information is stored in DynamoDB
5. Frontend retrieves and displays contact data through API Gateway
6. Network analysis is performed on the stored contacts
7. Real-time chat interface queries the contact database

## Infrastructure

![Infrastructure diagram](./docs/infra.png)

### Networking
- CloudFrontDistribution (CloudFront): Content Delivery Network (CDN) for caching, reduce latency and better website performance
  
### Storage
- BackendBucket (S3): Stores business card images
- FrontendBucket (S3): Hosts the web application
- MainDynamoDBTable: Stores contact information with userId and cardId as keys

### Compute
- MainFunction (Lambda): Handles API endpoints for scanning, contact management, and network analysis
- Textract: Perform OCR

### API & Authentication
- MainAPIGateway: REST API interface
- MainUserpool (Cognito): User authentication
- MainIdentityPool (Cognito): Federated identity management

### Security
- MainIdentityPoolIAMAuthRole: IAM role for authenticated users
- Bucket policies for secure access to S3 resources
- AWS Certificate Manager (ACM): Manage SSL/TLS certificates for use with CloudFront CDN

## Deployment
1. Prerequisites:
   - AWS CLI configured with appropriate permissions
   - SAM CLI installed
   - DeepSeek API key

2. Deployment Steps:
```bash
# Deploy all resources
./deploy.sh

# To clean up resources
./delete.sh
```

3. Environment Configuration:
   - Update samconfig.toml for different regions or stack names
   - Configure CORS settings in template.yaml for production domains

4. Monitoring:
   - CloudWatch Logs for Lambda function
   - S3 access logs for bucket monitoring
   - API Gateway metrics for endpoint performance