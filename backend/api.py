"""Origin control plane. API Gateway validates Cognito access tokens before invocation."""
import base64
import json
import os
import re
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

TABLE = boto3.resource('dynamodb').Table(os.environ['TABLE_NAME'])
DB = boto3.client('dynamodb')
REPO = re.compile(r'^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$')
IDENTIFIER = re.compile(r'^[0-9a-f]{32}$')

class Problem(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


def response(status, data):
    return {'statusCode': status, 'headers': {'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}, 'body': json.dumps(data)}


def body(event):
    raw = event.get('body') or '{}'
    try:
        if event.get('isBase64Encoded'):
            raw = base64.b64decode(raw, validate=True).decode('utf-8')
        if len(raw.encode('utf-8')) > 8192:
            raise Problem(413, 'Request body is too large')
        value = json.loads(raw)
    except (ValueError, UnicodeError):
        raise Problem(400, 'Invalid JSON body')
    if not isinstance(value, dict):
        raise Problem(400, 'Expected a JSON object')
    return value


def owner(event):
    claims = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {})
    subject = claims.get('sub')
    if not subject or claims.get('token_use') != 'access':
        raise Problem(401, 'Sign in with an access token')
    return 'USER#' + subject


def items(pk, prefix, cursor=None):
    params = {'KeyConditionExpression': Key('pk').eq(pk) & Key('sk').begins_with(prefix), 'Limit': 50}
    if cursor:
        try:
            key = json.loads(base64.urlsafe_b64decode(cursor).decode())
            if not isinstance(key, dict) or key.get('pk') != pk or not isinstance(key.get('sk'), str) or not key['sk'].startswith(prefix):
                raise ValueError()
            params['ExclusiveStartKey'] = key
        except (ValueError, KeyError, TypeError, UnicodeError):
            raise Problem(400, 'Invalid cursor')
    result = TABLE.query(**params)
    data = [{k: v for k, v in item.items() if k not in ('pk', 'sk')} for item in result.get('Items', [])]
    last = result.get('LastEvaluatedKey')
    return {'items': data, 'cursor': base64.urlsafe_b64encode(json.dumps(last).encode()).decode() if last else None}


def get_project(pk, project_id):
    if not IDENTIFIER.fullmatch(project_id):
        raise Problem(404, 'Project not found')
    value = TABLE.get_item(Key={'pk': pk, 'sk': 'PROJECT#' + project_id}, ConsistentRead=True).get('Item')
    if not value:
        raise Problem(404, 'Project not found')
    return value


def handler(event, context):
    try:
        path = event.get('rawPath', '')
        method = event.get('requestContext', {}).get('http', {}).get('method', '')
        if path == '/health' and method == 'GET':
            return response(200, {'service': 'origin-control-plane', 'buildWorkerEnabled': os.environ.get('BUILDS_ENABLED') == 'true'})
        pk = owner(event)
        query = event.get('queryStringParameters') or {}
        if path == '/projects' and method == 'GET':
            return response(200, items(pk, 'PROJECT#', query.get('cursor')))
        if path == '/projects' and method == 'POST':
            data = body(event)
            repo = data.get('repository', '')
            name = data.get('name', '')
            branch = data.get('branch', 'main')
            if not isinstance(repo, str) or not REPO.fullmatch(repo) or any(x in ('.', '..') for x in repo.split('/')):
                raise Problem(400, 'Repository must be owner/repository')
            if not isinstance(name, str) or not 1 <= len(name.strip()) <= 80:
                raise Problem(400, 'Name must contain 1–80 characters')
            if not isinstance(branch, str) or not re.fullmatch(r'[A-Za-z0-9_./-]{1,128}', branch) or '..' in branch:
                raise Problem(400, 'Invalid branch')
            project_id = uuid.uuid4().hex
            item = {'pk': pk, 'sk': 'PROJECT#' + project_id, 'id': project_id, 'name': name.strip(), 'repository': repo, 'branch': branch, 'createdAt': datetime.now(timezone.utc).isoformat(), 'connectionStatus': 'not_connected'}
            TABLE.put_item(Item=item, ConditionExpression='attribute_not_exists(pk)')
            return response(201, {k: v for k, v in item.items() if k not in ('pk', 'sk')})
        match = re.fullmatch(r'/projects/([^/]+)/deployments', path)
        if match:
            project = get_project(pk, match[1])
            if method == 'GET':
                return response(200, items(pk, 'DEPLOY#' + project['id'] + '#', query.get('cursor')))
            if method == 'POST':
                # Fail closed until a real build worker and source connection are configured.
                if os.environ.get('BUILDS_ENABLED') != 'true':
                    raise Problem(503, 'Build worker is not configured; no deployment was queued')
                if project.get('connectionStatus') != 'connected':
                    raise Problem(409, 'Connect and verify the repository first')
                deployment_id = uuid.uuid4().hex
                stamp = datetime.now(timezone.utc).isoformat()
                sk = 'DEPLOY#' + project['id'] + '#' + deployment_id
                deployment = {'pk': {'S': pk}, 'sk': {'S': sk}, 'id': {'S': deployment_id}, 'projectId': {'S': project['id']}, 'status': {'S': 'queued'}, 'createdAt': {'S': stamp}}
                outbox = {'pk': {'S': pk}, 'sk': {'S': 'OUTBOX#' + deployment_id}, 'deploymentId': {'S': deployment_id}, 'projectId': {'S': project['id']}, 'createdAt': {'S': stamp}}
                DB.transact_write_items(TransactItems=[{'Put': {'TableName': TABLE.name, 'Item': item, 'ConditionExpression': 'attribute_not_exists(pk)'}} for item in (deployment, outbox)])
                return response(202, {'id': deployment_id, 'projectId': project['id'], 'status': 'queued'})
        raise Problem(404, 'Route not found')
    except Problem as exc:
        return response(exc.status, {'error': exc.message})
    except ClientError:
        # Do not return AWS error bodies, account ids, request payloads, or credentials.
        return response(503, {'error': 'Storage temporarily unavailable'})
