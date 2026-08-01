import os
from datetime import datetime, timezone
from decimal import Decimal

try:
    import boto3
except ImportError:
    boto3 = None

from app.services.sqlite_db import (
    db_save_simulation,
    db_get_simulation,
    db_get_all_simulations,
    db_save_refinement,
    db_save_report,
    db_get_report,
)

TABLE_NAME = os.getenv('DYNAMODB_TABLE', 'raawa-simulations')


def _create_resource():
    if boto3 is None:
        return None

    if os.getenv('DYNAMODB_ENDPOINT'):
        return boto3.resource(
            'dynamodb',
            region_name=os.getenv('AWS_REGION', 'us-east-1'),
            endpoint_url=os.getenv('DYNAMODB_ENDPOINT')
        )

    access_key = os.getenv('AWS_ACCESS_KEY_ID')
    secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    if not access_key or not secret_key:
        return None

    return boto3.resource(
        'dynamodb',
        region_name=os.getenv('AWS_REGION', 'us-east-1'),
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key
    )


dynamodb_resource = _create_resource()


def get_table():
    """Get DynamoDB table"""
    if dynamodb_resource is None:
        return None

    try:
        table = dynamodb_resource.Table(TABLE_NAME)
        table.load()
        return table
    except Exception as e:
        print(f"Error accessing DynamoDB table: {e}")
        # Create table if it doesn't exist
        try:
            table = dynamodb_resource.create_table(
                TableName=TABLE_NAME,
                KeySchema=[
                    {'AttributeName': 'simulation_id', 'KeyType': 'HASH'},
                    {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'simulation_id', 'AttributeType': 'S'},
                    {'AttributeName': 'created_at', 'AttributeType': 'S'}
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            table.wait_until_exists()
            return table
        except Exception as create_error:
            print(f"Error creating DynamoDB table: {create_error}")
            raise


def save_simulation(simulation_id, concept, audience, backlash_score, sample_posts, metadata=None):
    """Save simulation result to DynamoDB or SQLite fallback"""
    item = {
        'simulation_id': simulation_id,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'concept': concept,
        'audience': audience,
        'backlash_score': float(backlash_score),
        'sample_posts': sample_posts,
        'metadata': metadata or {}
    }

    if dynamodb_resource is None:
        return db_save_simulation(item)

    try:
        table = get_table()
        
        dynamo_item = dict(item)
        dynamo_item['backlash_score'] = Decimal(str(backlash_score))
        
        table.put_item(Item=dynamo_item)
        return item
    except Exception as e:
        print(f"Error saving simulation: {e}")
        raise


def get_simulation(simulation_id):
    """Retrieve a simulation by ID"""
    if dynamodb_resource is None:
        return db_get_simulation(simulation_id)

    try:
        table = get_table()
        from boto3.dynamodb.conditions import Attr

        response = table.scan(
            FilterExpression=Attr('simulation_id').eq(simulation_id)
        )
        items = response.get('Items', [])
        return items[0] if items else None
    except Exception as e:
        print(f"Error retrieving simulation: {e}")
        return None


def get_all_simulations():
    """Get all simulations"""
    if dynamodb_resource is None:
        return db_get_all_simulations()

    try:
        table = get_table()
        response = table.scan()
        return response.get('Items', [])
    except Exception as e:
        print(f"Error scanning simulations: {e}")
        return []


def save_refinement(simulation_id, refinement_data):
    """Save refinement data for a simulation"""
    item = {
        'simulation_id': f"{simulation_id}-refinement",
        'created_at': datetime.now(timezone.utc).isoformat(),
        'parent_simulation_id': simulation_id,
        'policy': refinement_data.get('policy'),
        'recommendations': refinement_data.get('recommendations'),
        'metadata': refinement_data.get('metadata', {})
    }

    if dynamodb_resource is None:
        return db_save_refinement(item)

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
    
    item = {
        'simulation_id': f"{simulation_id}-report",
        'created_at': datetime.now(timezone.utc).isoformat(),
        'parent_simulation_id': simulation_id,
        'title': report_data.get('title'),
        'content': report_data.get('content') or "",
        'metadata': metadata
    }

    if dynamodb_resource is None:
        return db_save_report(item)

    try:
        table = get_table()
        table.put_item(Item=item)
        return item
    except Exception as e:
        print(f"Error saving report: {e}")
        raise


def get_report(simulation_id):
    """Retrieve report for a simulation"""
    if dynamodb_resource is None:
        raw_report = db_get_report(simulation_id)
    else:
        try:
            table = get_table()
            from boto3.dynamodb.conditions import Attr
            report_id = f"{simulation_id}-report"
            response = table.scan(
                FilterExpression=Attr('simulation_id').eq(report_id) | Attr('parent_simulation_id').eq(simulation_id)
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
