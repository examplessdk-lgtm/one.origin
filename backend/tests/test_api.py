import importlib
import json
import os
import sys
import types
import unittest
from unittest.mock import MagicMock, Mock, patch

# No credentials or AWS network calls are needed for this unit suite.
os.environ['TABLE_NAME'] = 'test'
boto = types.ModuleType('boto3')
boto.resource = Mock()
boto.client = Mock()
conditions = types.ModuleType('boto3.dynamodb.conditions')
conditions.Key = MagicMock()
error_module = types.ModuleType('botocore.exceptions')
class ClientError(Exception):
    pass
error_module.ClientError = ClientError
with patch.dict(sys.modules, {'boto3': boto, 'boto3.dynamodb': types.ModuleType('boto3.dynamodb'), 'boto3.dynamodb.conditions': conditions, 'botocore': types.ModuleType('botocore'), 'botocore.exceptions': error_module}):
    api = importlib.import_module('api')
    dispatcher = importlib.import_module('dispatcher')


def request(path='/projects', method='GET', data=None, user='alice', token_use='access'):
    return {'rawPath': path, 'body': json.dumps(data) if data is not None else None, 'requestContext': {'http': {'method': method}, 'authorizer': {'jwt': {'claims': {'sub': user, 'token_use': token_use} if user else {}}}}}

class ApiTests(unittest.TestCase):
    def setUp(self):
        api.TABLE = Mock(name='table')
        api.DB = Mock()
        api.TABLE.name = 'test'
        api.TABLE.query.return_value = {'Items': []}
        api.TABLE.get_item.return_value = {}

    def test_no_auth_and_id_token_rejected(self):
        for event in [request(user=None), request(token_use='id')]:
            self.assertEqual(api.handler(event, None)['statusCode'], 401)
        api.TABLE.query.assert_not_called()

    def test_tenant_isolation_for_project_lookup(self):
        project_id = 'a' * 32
        result = api.handler(request('/projects/' + project_id + '/deployments', user='bob'), None)
        self.assertEqual(result['statusCode'], 404)
        self.assertEqual(api.TABLE.get_item.call_args.kwargs['Key']['pk'], 'USER#bob')

    def test_invalid_and_oversized_json(self):
        for raw, status in [('[]', 400), ('{', 400), ('x' * 8193, 413)]:
            event = request(method='POST')
            event['body'] = raw
            self.assertEqual(api.handler(event, None)['statusCode'], status)
        api.TABLE.put_item.assert_not_called()

    def test_repository_and_branch_validation(self):
        for repo, branch in [('https://evil.example/repo', 'main'), ('../repo', 'main'), ('owner/repo', 'main; curl evil')]:
            result = api.handler(request(method='POST', data={'name': 'app', 'repository': repo, 'branch': branch}), None)
            self.assertEqual(result['statusCode'], 400)

    def test_create_binds_owner_and_never_claims_connected(self):
        result = api.handler(request(method='POST', data={'name': 'app', 'repository': 'owner/repo'}), None)
        self.assertEqual(result['statusCode'], 201)
        item = api.TABLE.put_item.call_args.kwargs['Item']
        self.assertEqual(item['pk'], 'USER#alice')
        self.assertEqual(item['connectionStatus'], 'not_connected')
        self.assertNotIn('pk', json.loads(result['body']))

    def test_cannot_queue_without_worker(self):
        api.TABLE.get_item.return_value = {'Item': {'id': 'a'*32}}
        with patch.dict(os.environ, {'BUILDS_ENABLED': 'false'}):
            result = api.handler(request('/projects/' + 'a'*32 + '/deployments', 'POST'), None)
        self.assertEqual(result['statusCode'], 503)
        api.DB.transact_write_items.assert_not_called()

    def test_cross_tenant_cursor_rejected(self):
        import base64
        event = request()
        event['queryStringParameters'] = {'cursor': base64.urlsafe_b64encode(json.dumps({'pk': 'USER#bob', 'sk': 'PROJECT#a'}).encode()).decode()}
        self.assertEqual(api.handler(event, None)['statusCode'], 400)
        api.TABLE.query.assert_not_called()

    def test_outbox_delivery_failure_is_retryable(self):
        dispatcher.SQS = Mock()
        dispatcher.SQS.send_message.side_effect = RuntimeError('unavailable')
        record = {'eventName': 'INSERT', 'dynamodb': {'SequenceNumber': '42', 'NewImage': {k: {'S': v} for k, v in {'sk':'OUTBOX#a', 'pk':'USER#alice', 'deploymentId':'a','projectId':'b'}.items()}}}
        with patch.dict(os.environ, {'QUEUE_URL': 'https://queue.invalid'}):
            self.assertEqual(dispatcher.handler({'Records': [record]}, None), {'batchItemFailures':[{'itemIdentifier':'42'}]})

    def test_storage_errors_are_redacted(self):
        api.TABLE.query.side_effect = ClientError('sensitive AWS detail')
        result = api.handler(request(), None)
        self.assertEqual(result['statusCode'], 503)
        self.assertNotIn('sensitive', result['body'])

if __name__ == '__main__':
    unittest.main()
