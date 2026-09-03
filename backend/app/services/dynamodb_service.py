import os
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

TABLE_NAME = os.getenv('DYNAMODB_TABLE', 'raawa-data')


def _create_resource():
    region = os.getenv("AWS_REGION", "ap-south-1")
    endpoint = os.getenv("DYNAMODB_ENDPOINT")

    if endpoint:
        return boto3.resource(
            "dynamodb",
            region_name=region,
            endpoint_url=endpoint,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "dummy"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "dummy"),
        )

    return boto3.resource(
        "dynamodb",
        region_name=region,
    )


dynamodb_resource = _create_resource()


def _to_dynamodb_value(value):
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {key: _to_dynamodb_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_to_dynamodb_value(item) for item in value]
    return value


def get_table():
    """Get or create the DynamoDB table"""
    table = dynamodb_resource.Table(TABLE_NAME)

    try:
        table.load()
        return table
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code != "ResourceNotFoundException":
            raise

    print(f"Creating DynamoDB table '{TABLE_NAME}'...")
    try:
        table = dynamodb_resource.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI1-PK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI1-SK', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'GSI1',
                    'KeySchema': [
                        {'AttributeName': 'GSI1-PK', 'KeyType': 'HASH'},
                        {'AttributeName': 'GSI1-SK', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {
                        'ProjectionType': 'ALL'
                    }
                }
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        table.wait_until_exists()
        return table
    except Exception as create_error:
        print(f"Error creating DynamoDB table: {create_error}")
        raise


def save_simulation(simulation_id, concept, audience, backlash_score, sample_posts, metadata=None):
    """Save simulation result to DynamoDB"""
    created_at = datetime.now(timezone.utc).isoformat()
    item = {
        'PK': f"SIM#{simulation_id}",
        'SK': "METADATA",
        'GSI1-PK': "ALL_SIMULATIONS",
        'GSI1-SK': created_at,
        'simulation_id': simulation_id,
        'created_at': created_at,
        'concept': concept,
        'audience': audience,
        'backlash_score': float(backlash_score),
        'sample_posts': sample_posts,
        'metadata': metadata or {}
    }

    try:
        table = get_table()
        dynamo_item = _to_dynamodb_value(item)
        dynamo_item['backlash_score'] = Decimal(str(backlash_score))
        
        table.put_item(Item=dynamo_item)
        return item
    except Exception as e:
        print(f"Error saving simulation: {e}")
        raise


def get_simulation(simulation_id):
    """Retrieve a simulation by ID"""
    try:
        table = get_table()
        response = table.get_item(
            Key={
                'PK': f"SIM#{simulation_id}",
                'SK': "METADATA"
            }
        )
        item = response.get('Item')
        if item and 'backlash_score' in item:
            item['backlash_score'] = float(item['backlash_score'])
        return item
    except Exception as e:
        print(f"Error retrieving simulation: {e}")
        return None


def get_all_simulations():
    """Get all simulations"""
    try:
        table = get_table()
        response = table.query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1-PK").eq("ALL_SIMULATIONS"),
            ScanIndexForward=False
        )
        items = response.get('Items', [])
        for item in items:
            if 'backlash_score' in item:
                item['backlash_score'] = float(item['backlash_score'])
        return items
    except Exception as e:
        print(f"Error scanning simulations: {e}")
        return []


def save_refinement(simulation_id, refinement_data):
    """Save refinement data for a simulation"""
    refinement_id = f"{simulation_id}-refinement"
    item = {
        'PK': f"SIM#{simulation_id}",
        'SK': f"REFINEMENT#{refinement_id}",
        'simulation_id': refinement_id,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'parent_simulation_id': simulation_id,
        'policy': refinement_data.get('policy'),
        'recommendations': refinement_data.get('recommendations'),
        'metadata': refinement_data.get('metadata', {})
    }

    try:
        table = get_table()
        table.put_item(Item=item)
        return item
    except Exception as e:
        print(f"Error saving refinement: {e}")
        raise


def save_report(simulation_id, report_data):
    """Save generated report for a simulation"""
    metadata = {
        **(report_data.get('metadata') or {}),
        'executiveSummary': report_data.get('executiveSummary'),
        'riskAnalysis': report_data.get('riskAnalysis'),
        'demographicImpact': report_data.get('demographicImpact'),
        'strategicRecommendations': report_data.get('strategicRecommendations'),
        'conclusion': report_data.get('conclusion'),
        'date': report_data.get('date') or datetime.now(timezone.utc).strftime('%Y-%m-%d'),
    }
    
    report_id = f"{simulation_id}-report"
    item = {
        'PK': f"SIM#{simulation_id}",
        'SK': f"REPORT#{report_id}",
        'simulation_id': report_id,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'parent_simulation_id': simulation_id,
        'title': report_data.get('title'),
        'content': report_data.get('content') or "",
        'metadata': metadata
    }

    try:
        table = get_table()
        table.put_item(Item=item)
        return item
    except Exception as e:
        print(f"Error saving report: {e}")
        raise


def get_report(simulation_id):
    """Retrieve report for a simulation"""
    try:
        table = get_table()
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"SIM#{simulation_id}") & Key("SK").begins_with("REPORT#")
        )
        items = response.get('Items', [])
        raw_report = items[0] if items else None
    except Exception as e:
        print(f"Error retrieving report: {e}")
        raw_report = None

    if not raw_report:
        return None

    meta = raw_report.get('metadata') or {}
    return {
        "title": raw_report.get('title') or f"Report: {simulation_id}",
        "date": meta.get('date') or raw_report.get('created_at', '')[:10],
        "executiveSummary": meta.get('executiveSummary') or "",
        "riskAnalysis": meta.get('riskAnalysis') or "",
        "demographicImpact": meta.get('demographicImpact') or "",
        "strategicRecommendations": meta.get('strategicRecommendations') or [],
        "conclusion": meta.get('conclusion') or "",
        "content": raw_report.get('content') or "",
        "metadata": {
            "simulation_id": raw_report.get('parent_simulation_id') or simulation_id
        }
    }
