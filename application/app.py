import json
import boto3
import os
import uuid
import base64
import logging
from openai import OpenAI
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

# Get DynamoDB table name from environment variables
DYNAMODB_TABLE_NAME = os.environ['DYNAMODB_TABLE_NAME']

# Specify the region explicitly
REGION = 'ap-southeast-1'

# Set OpenAI API key for DeepSeek
client = OpenAI(api_key=os.environ.get('DEEPSEEK_API_KEY'), base_url="https://api.deepseek.com")

# Initialize AWS services
dynamodb = boto3.resource('dynamodb', region_name=REGION)
textract = boto3.client('textract', region_name=REGION)
table = dynamodb.Table(DYNAMODB_TABLE_NAME)

def lambda_handler(event, context):
    """Main Lambda handler function."""
    http_method = event['httpMethod']
    path = event['path']
    logger.info(f"Handling request: {http_method} {path}")
    
    # Base CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    }

    if path == '/scan' and http_method == 'POST':
        return scan_business_card(event, context, cors_headers)
    elif path == '/network' and http_method == 'GET':
        return get_network_analysis(event, cors_headers)
    elif path == '/contacts' and http_method == 'GET':
        return get_contacts(event, cors_headers)
    elif path == '/contacts' and http_method == 'DELETE':
        return delete_all_contacts(event, cors_headers)
    elif path.startswith('/contacts/') and http_method == 'DELETE':
        return delete_contact(event, cors_headers)
    elif path.startswith('/contacts/') and http_method == 'PUT':
        return update_contact(event, cors_headers)
    elif path.startswith('/images/') and http_method == 'GET':
        return get_image(event, cors_headers)
    elif path.startswith('/vcard/') and http_method == 'GET':
        return get_vcard(event, cors_headers)
    elif path == '/chat' and http_method == 'POST':
        return handle_chat_message(event, cors_headers)
    elif http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'CORS preflight'})
        }
    else:
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Not Found'}),
            'headers': cors_headers
        }

def scan_business_card(event, context, cors_headers):
    try:
        body = json.loads(event['body'])
        user_id = body.get('userId', 'anonymous')
        images = body.get('images', []) 
        
        if not images:
            image_base64 = body.get('image')
            if not image_base64:
                raise KeyError("No images provided")
            images = [image_base64]

        results = []
        for image_base64 in images:
            image_bytes = base64.b64decode(image_base64)
            
            # Extract text with Textract
            textract_response = textract.detect_document_text(Document={'Bytes': image_bytes})
            raw_text = extract_raw_text(textract_response)
            
            # Parse with DeepSeek
            card_data = parse_with_deepseek(raw_text)
            
            # Generate cardId and add metadata
            card_id = str(uuid.uuid4())
            card_data['userId'] = user_id
            card_data['cardId'] = card_id
            card_data['dateAdded'] = datetime.now().isoformat()
            
            # Upload the original image to S3
            image_url = upload_image_to_s3(image_bytes, card_id, user_id)
            
            # Store the image URL in card data
            card_data['imageUrl'] = image_url
            
            # Save to DynamoDB
            table.put_item(Item=card_data)
            results.append(card_data)

        return {
            'statusCode': 200,
            'body': json.dumps({'contacts': results}),
            'headers': cors_headers
        }
    except KeyError as e:
        logger.error(f"KeyError: {str(e)}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': f'Missing key: {str(e)}'}),
            'headers': cors_headers
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': cors_headers
        }

def extract_raw_text(textract_response):
    text_blocks = [block['Text'] for block in textract_response['Blocks'] if block['BlockType'] == 'LINE']
    return '\n'.join(text_blocks)

def parse_with_deepseek(raw_text):
    prompt = (
        "Extract the following information from the provided business card text: "
        "name, company, department, title, email, phone, address, website. "
        "Additionally, categorize the company's industry from the following list: "
        "Technology, Healthcare, Finance, Manufacturing, Retail, Education, "
        "Government, Non-Profit, Media, Transportation, Energy, Agriculture, "
        "Construction, Hospitality, Legal, Consulting, Real Estate, Telecommunications, "
        "Other. Return the data as a JSON object with these exact keys, including 'industry' "
        "as the last key. Leave keys empty if not found. "
        "Extract only the core company name (e.g., 'AWS' from 'AWS Commercial Sales'). "
        "For industry categorization, consider both the company name and title. "
        "Do not include any additional text outside the JSON object."
    )
    try:
        completion = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are an expert data extraction assistant tasked with parsing raw text from business cards and categorizing industries."},
                {"role": "user", "content": f"{prompt}\n\nText:\n{raw_text}"}
            ],
            stream=False
        )
        card_data_str = completion.choices[0].message.content
        cleaned_card_data_str = card_data_str.replace('```json', '').replace('```', '').strip()
        try:
            card_data = json.loads(cleaned_card_data_str)
            return card_data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse cleaned DeepSeek response as JSON: {cleaned_card_data_str}, Error: {str(e)}")
            return {
                'name': '',
                'company': '',
                'title': '',
                'email': '',
                'phone': '',
                'address': '',
                'website': '',
                'industry': 'Other'
            }
    except Exception as e:
        raise Exception(f"DeepSeek API error: {str(e)}")

def get_contacts(event, cors_headers):
    try:
        user_id = event.get('queryStringParameters', {}).get('userId', 'anonymous')
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id)
        )
        items = response['Items']
        return {
            'statusCode': 200,
            'body': json.dumps(items),
            'headers': cors_headers
        }
    except Exception as e:
        logger.error(f"Error retrieving contacts: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': cors_headers
        }

def get_network_analysis(event, cors_headers):
    try:
        user_id = event.get('queryStringParameters', {}).get('userId', None)
        if not user_id:
            user_id = event.get('headers', {}).get('userId', 'anonymous')

        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id)
        )
        contacts = response['Items']

        nodes = []
        links = []
        company_counts = {}
        company_nodes = set()

        for contact in contacts:
            nodes.append({
                'id': contact['cardId'],
                'name': contact.get('name', 'Unknown'),
                'type': 'person',
                'company': contact.get('company', 'Unknown')
            })
            company = contact.get('company', 'Unknown')
            company_counts[company] = company_counts.get(company, 0) + 1
            company_nodes.add(company)
            links.append({
                'source': contact['cardId'],
                'target': company,
                'type': 'works_at'
            })

        for company in company_nodes:
            nodes.append({
                'id': company,
                'name': company,
                'type': 'company',
                'count': company_counts.get(company, 0)
            })

        clusters = {}
        for contact in contacts:
            company = contact.get('company', 'Unknown')
            if company not in clusters:
                clusters[company] = []
            clusters[company].append(contact['cardId'])

        influence = sorted(
            [{'company': company, 'count': count} for company, count in company_counts.items()],
            key=lambda x: x['count'],
            reverse=True
        )[:5]

        analysis_result = {
            'nodes': nodes,
            'links': links,
            'clusters': clusters,
            'influence': influence,
            'total_contacts': len(contacts),
            'unique_companies': len(company_nodes)
        }

        return {
            'statusCode': 200,
            'body': json.dumps(analysis_result),
            'headers': cors_headers
        }
    except Exception as e:
        logger.error(f"Error in network analysis: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': cors_headers
        }

def delete_all_contacts(event, cors_headers):
    try:
        body = json.loads(event['body'])
        user_id = body.get('userId')
        
        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'userId is required'}),
                'headers': cors_headers
            }

        # Query all contacts for the user
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id)
        )
        items = response['Items']
        
        # Initialize S3 client
        s3_client = boto3.client('s3', region_name=REGION)
        bucket_name = os.environ['BACKEND_BUCKET_NAME']
        deleted_count = 0
        
        # Delete each contact and its associated image
        for item in items:
            card_id = item['cardId']
            
            # Delete the contact from DynamoDB
            table.delete_item(
                Key={
                    'userId': user_id,
                    'cardId': card_id
                }
            )
            
            # Delete the image from S3 if it exists
            try:
                image_key = f"{user_id}/cards/{card_id}.jpg"
                s3_client.delete_object(
                    Bucket=bucket_name,
                    Key=image_key
                )
                logger.info(f"Deleted image from S3: {image_key}")
            except Exception as e:
                logger.warning(f"Error deleting image from S3: {str(e)}")
                # Continue with deletion even if image deletion fails
            
            deleted_count += 1

        return {
            'statusCode': 200,
            'body': json.dumps({'message': f'Successfully deleted {deleted_count} contacts and their images'}),
            'headers': cors_headers
        }
    except Exception as e:
        logger.error(f"Error deleting all contacts: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': cors_headers
        }

def delete_contact(event, cors_headers):
    try:
        card_id = event['pathParameters']['cardId']
        user_id = event.get('queryStringParameters', {}).get('userId', None)
        if not user_id:
            raise KeyError("userId is required")
            
        # First, get the contact to check if it has an image
        contact_response = table.get_item(
            Key={
                'userId': user_id,
                'cardId': card_id
            }
        )
        
        # Delete the contact from DynamoDB
        response = table.delete_item(
            Key={
                'userId': user_id,
                'cardId': card_id
            },
            ConditionExpression="attribute_exists(userId) AND attribute_exists(cardId)"
        )
        
        # Delete the image from S3 if it exists
        try:
            s3_client = boto3.client('s3', region_name=REGION)
            bucket_name = os.environ['BACKEND_BUCKET_NAME']
            image_key = f"{user_id}/cards/{card_id}.jpg"
            
            s3_client.delete_object(
                Bucket=bucket_name,
                Key=image_key
            )
            logger.info(f"Deleted image from S3: {image_key}")
        except Exception as e:
            logger.warning(f"Error deleting image from S3: {str(e)}")
            # Continue with deletion even if image deletion fails

        return {
            'statusCode': 200,
            'body': json.dumps({'message': f"Contact {card_id} and its image deleted successfully"}),
            'headers': cors_headers
        }
    except KeyError as e:
        logger.error(f"KeyError: {str(e)}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': f'Missing key: {str(e)}'}),
            'headers': cors_headers
        }
    except Exception as e:
        logger.error(f"Error deleting contact: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': cors_headers
        }

def update_contact(event, cors_headers):
    """Update a specific contact card."""
    try:
        card_id = event['pathParameters']['cardId']
        user_id = event.get('queryStringParameters', {}).get('userId', None)
        if not user_id:
            raise KeyError("userId is required")

        body = json.loads(event['body'])
        
        # First, get the existing contact to preserve fields like imageUrl
        existing_contact_response = table.get_item(
            Key={
                'userId': user_id,
                'cardId': card_id
            }
        )
        
        # Check if the contact exists
        if 'Item' not in existing_contact_response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': f"Contact {card_id} not found"}),
                'headers': cors_headers
            }
            
        existing_contact = existing_contact_response['Item']
        
        # Create updated contact by merging existing contact with new data
        updated_contact = {
            'userId': user_id,
            'cardId': card_id,
            'name': body.get('name', existing_contact.get('name', '')),
            'company': body.get('company', existing_contact.get('company', '')),
            'department': body.get('department', existing_contact.get('department', '')),
            'industry': body.get('industry', existing_contact.get('industry', '')),
            'title': body.get('title', existing_contact.get('title', '')),
            'email': body.get('email', existing_contact.get('email', '')),
            'phone': body.get('phone', existing_contact.get('phone', '')),
            'address': body.get('address', existing_contact.get('address', '')),
            'website': body.get('website', existing_contact.get('website', '')),
            'dateAdded': body.get('dateAdded', existing_contact.get('dateAdded', datetime.now().isoformat()))
        }
        
        # Preserve imageUrl if it exists in the original contact
        if 'imageUrl' in existing_contact:
            updated_contact['imageUrl'] = existing_contact['imageUrl']
            
        # Also preserve any other fields that might exist in the original contact
        for key, value in existing_contact.items():
            if key not in updated_contact:
                updated_contact[key] = value

        # Update the item in DynamoDB
        response = table.put_item(Item=updated_contact)

        return {
            'statusCode': 200,
            'body': json.dumps({'message': f"Contact {card_id} updated successfully", 'contact': updated_contact}),
            'headers': cors_headers
        }
    except KeyError as e:
        logger.error(f"KeyError: {str(e)}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': f'Missing key: {str(e)}'}),
            'headers': cors_headers
        }
    except Exception as e:
        logger.error(f"Error updating contact: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': cors_headers
        }

def upload_image_to_s3(image_bytes, card_id, user_id):
    """Upload the original image to S3 bucket"""
    s3_client = boto3.client('s3', region_name=REGION)
    bucket_name = os.environ['BACKEND_BUCKET_NAME']
    
    # Create a unique filename with path structure by user
    key = f"{user_id}/cards/{card_id}.jpg"
    
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=image_bytes,
            ContentType='image/jpeg'
        )
        # Return the S3 object URL
        return f"s3://{bucket_name}/{key}"
    except Exception as e:
        logger.error(f"Error uploading image to S3: {str(e)}")
        raise e

def get_image(event, cors_headers):
    try:
        card_id = event['pathParameters']['cardId']
        user_id = event.get('queryStringParameters', {}).get('userId', None)
        
        if not user_id:
            raise KeyError("userId is required")
        
        s3_client = boto3.client('s3', region_name=REGION)
        bucket_name = os.environ['BACKEND_BUCKET_NAME']
        key = f"{user_id}/cards/{card_id}.jpg"
        
        # Generate a presigned URL for secure, temporary access
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket_name,
                'Key': key
            },
            ExpiresIn=3600  # URL expires in 1 hour
        )
        
        return {
            'statusCode': 302,  # Redirect
            'headers': {
                **cors_headers,
                'Location': url
            },
            'body': ''
        }
    except Exception as e:
        logger.error(f"Error retrieving image: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': cors_headers
        }

def get_vcard(event, cors_headers):
    """Generate and return a vCard file for a contact."""
    try:
        card_id = event['pathParameters']['cardId']
        user_id = event.get('queryStringParameters', {}).get('userId', None)
        
        if not user_id:
            raise KeyError("userId is required")
        
        # Get contact data from DynamoDB
        response = table.get_item(
            Key={
                'userId': user_id,
                'cardId': card_id
            }
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Contact not found'}),
                'headers': cors_headers
            }
            
        contact = response['Item']
        
        # Generate vCard content
        vcard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            f'N:{contact.get("name", "")};;;',
            f'FN:{contact.get("name", "")}',
            f'ORG:{contact.get("company", "")}',
            f'ROLE:{contact.get("title", "")}',
            f'EMAIL:{contact.get("email", "")}',
            f'TEL:{contact.get("phone", "")}',
            f'ADR:;;{contact.get("address", "")};;;',
            f'URL:{contact.get("website", "")}',
            'END:VCARD'
        ]
        
        vcard_content = '\n'.join(vcard)
        
        return {
            'statusCode': 200,
            'headers': {
                **cors_headers,
                'Content-Type': 'text/vcard',
                'Content-Disposition': f'attachment; filename="{contact.get("name", "contact")}.vcf"'
            },
            'body': vcard_content
        }
    except Exception as e:
        logger.error(f"Error generating vCard: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': cors_headers
        }

def handle_chat_message(event, cors_headers):
    """Handle chat messages using DeepSeek."""
    try:
        body = json.loads(event['body'])
        message = body.get('message')
        user_id = body.get('userId')
        contacts = body.get('contacts', [])

        if not message or not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required fields'}),
                'headers': cors_headers
            }

        # Prepare context from contacts data
        context = []
        for contact in contacts:
            context.append({
                'name': contact.get('name', ''),
                'company': contact.get('company', ''),
                'title': contact.get('title', ''),
                'industry': contact.get('industry', ''),
                'email': contact.get('email', ''),
                'phone': contact.get('phone', ''),
                'location': contact.get('location', '')
            })

        prompt = (
            "You are a helpful assistant that helps users analyze their contact database. "
            "You have access to the user's contacts and can provide insights, answer questions, "
            "and help with data analysis. Be concise but informative in your responses. "
            "Focus on providing actionable insights and specific information from the contact database."
            "If a user's contact need to be included in your response, always start and end with a double line breaks."
        )

        try:
            completion = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Here is the user's contact database: {json.dumps(context)}"},
                    {"role": "user", "content": message}
                ],
                stream=False,
                temperature=0.7,
                max_tokens=500
            )
            assistant_response = completion.choices[0].message.content

            return {
                'statusCode': 200,
                'body': json.dumps({'response': assistant_response}),
                'headers': cors_headers
            }
        except Exception as e:
            raise Exception(f"DeepSeek API error: {str(e)}")

    except Exception as e:
        logger.error(f"Error handling chat message: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': cors_headers
        }