"""Durable outbox → SQS. Delivery is at least once; consumers must deduplicate deploymentId."""
import json
import os
import boto3

SQS = boto3.client('sqs')


def handler(event, context):
    failures = []
    for record in event.get('Records', []):
        if record.get('eventName') != 'INSERT':
            continue
        data = record['dynamodb'].get('NewImage', {})
        if not data.get('sk', {}).get('S', '').startswith('OUTBOX#'):
            continue
        try:
            payload = {key: data[key]['S'] for key in ('pk', 'deploymentId', 'projectId')}
            SQS.send_message(QueueUrl=os.environ['QUEUE_URL'], MessageBody=json.dumps(payload))
        except Exception:
            failures.append({'itemIdentifier': record['dynamodb']['SequenceNumber']})
    return {'batchItemFailures': failures}
