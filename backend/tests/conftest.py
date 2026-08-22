import os
import pytest
from unittest.mock import MagicMock, patch

# Set mock AWS env variables before importing anything else
os.environ["AWS_ACCESS_KEY_ID"] = "dummy"
os.environ["AWS_SECRET_ACCESS_KEY"] = "dummy"
os.environ["AWS_REGION"] = "ap-south-1"
os.environ["DYNAMODB_TABLE"] = "raawa-data"
if "DYNAMODB_ENDPOINT" in os.environ:
    del os.environ["DYNAMODB_ENDPOINT"]


class InMemTable:
    def __init__(self, name):
        self.name = name
        self.store = {}  # Key is (PK, SK)

    def load(self):
        pass

    def put_item(self, Item):
        pk = Item.get("PK")
        sk = Item.get("SK")
        if not pk or not sk:
            raise ValueError("PK and SK are required")
        self.store[(pk, sk)] = Item
        return {}

    def get_item(self, Key):
        pk = Key.get("PK")
        sk = Key.get("SK")
        item = self.store.get((pk, sk))
        if item:
            return {"Item": dict(item)}
        return {}

    def delete_item(self, Key):
        pk = Key.get("PK")
        sk = Key.get("SK")
        self.store.pop((pk, sk), None)
        return {}

    def query(self, **kwargs):
        index_name = kwargs.get("IndexName")
        kce = kwargs.get("KeyConditionExpression")
        scan_index_forward = kwargs.get("ScanIndexForward", True)
        
        kce_str = str(kce)
        results = []
        
        for (pk, sk), item in self.store.items():
            if index_name == "GSI1":
                gsi_pk = item.get("GSI1-PK")
                gsi_sk = item.get("GSI1-SK")
                if not gsi_pk:
                    continue
                if f"'{gsi_pk}'" in kce_str or f'"{gsi_pk}"' in kce_str:
                    if "begins_with" in kce_str and "GSI1-SK" in kce_str:
                        prefix = None
                        if "REVIEW#" in kce_str:
                            prefix = "REVIEW#"
                        if prefix and not gsi_sk.startswith(prefix):
                            continue
                    results.append(item)
            else:
                if f"'{pk}'" in kce_str or f'"{pk}"' in kce_str:
                    if "begins_with" in kce_str:
                        prefix = None
                        for p in ["ORG#", "PM#", "REVIEWER#", "REVIEW#", "REPORT#", "REFINEMENT#"]:
                            if f"'{p}'" in kce_str or f'"{p}"' in kce_str:
                                prefix = p
                                break
                        if prefix and not sk.startswith(prefix):
                            continue
                    results.append(item)
        
        if "ALL_SIMULATIONS" in kce_str:
            results.sort(key=lambda x: x.get("GSI1-SK", ""), reverse=not scan_index_forward)
            
        return {"Items": results}

    def scan(self, **kwargs):
        fe_str = str(kwargs.get("FilterExpression", ""))
        results = []
        for item in self.store.values():
            match = True
            for val in ["organization", "payment_method", "reviewer", "review"]:
                if f"'{val}'" in fe_str or f'"{val}"' in fe_str:
                    if item.get("entity_type") != val:
                        match = False
                    break
            
            if "reviewer_email" in fe_str:
                if "testuser@raawa.ai" in fe_str:
                    if item.get("reviewer_email") != "testuser@raawa.ai":
                        match = False
                        
            if match:
                results.append(item)
        return {"Items": results}


# Setup the mock Table resource globally before pytest imports test files
mock_tables = {}

def get_mock_table(name, *args, **kwargs):
    if name not in mock_tables:
        mock_tables[name] = InMemTable(name)
    return mock_tables[name]

mock_resource = MagicMock()
mock_resource.Table.side_effect = get_mock_table
mock_resource.create_table.side_effect = lambda TableName, **kwargs: get_mock_table(TableName)

# Start global patcher
patcher = patch("boto3.resource", return_value=mock_resource)
patcher.start()


def pytest_unconfigure(config):
    # Stop the patcher when pytest finishes
    patcher.stop()


@pytest.fixture(autouse=True, scope="function")
def clear_mock_database():
    # Clear mock databases between tests to keep test runs isolated
    for table in mock_tables.values():
        table.store.clear()
    yield
