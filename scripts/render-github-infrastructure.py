"""Render the isolated read-only connector. Does not call AWS or deploy anything."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ref = lambda name: {'Ref': name}
get = lambda name, attribute: {'Fn::GetAtt': [name, attribute]}
resources = {
    'Logs': {'Type': 'AWS::Logs::LogGroup', 'Properties': {'RetentionInDays': 7}},
    'Role': {'Type': 'AWS::IAM::Role', 'Properties': {
        'AssumeRolePolicyDocument': {'Version': '2012-10-17', 'Statement': [{
            'Effect': 'Allow', 'Principal': {'Service': 'lambda.amazonaws.com'}, 'Action': 'sts:AssumeRole'}]},
        'Policies': [{'PolicyName': 'ReadOneGitHubCredential', 'PolicyDocument': {
            'Version': '2012-10-17', 'Statement': [
                {'Effect': 'Allow', 'Action': ['secretsmanager:GetSecretValue'], 'Resource': ref('GitHubSecretArn')},
                {'Effect': 'Allow', 'Action': ['logs:CreateLogStream', 'logs:PutLogEvents'], 'Resource': get('Logs', 'Arn')},
            ]}}]}},
    'Function': {'Type': 'AWS::Lambda::Function', 'Properties': {
        'Runtime': 'nodejs22.x', 'Handler': 'index.handler', 'Timeout': 25,
        'MemorySize': 256,
        'Role': get('Role', 'Arn'), 'LoggingConfig': {'LogGroup': ref('Logs')},
        'Environment': {'Variables': {'GITHUB_SECRET_ARN': ref('GitHubSecretArn'), 'ALLOWED_REPOSITORIES': ref('AllowedRepositories')}},
        'Code': {'ZipFile': (ROOT / 'backend/github-app.cjs').read_text()},
    }},
    'Integration': {'Type': 'AWS::ApiGatewayV2::Integration', 'Properties': {
        'ApiId': ref('ApiId'), 'IntegrationType': 'AWS_PROXY',
        'IntegrationUri': get('Function', 'Arn'), 'PayloadFormatVersion': '2.0', 'TimeoutInMillis': 28000,
    }},
    'InvokePermission': {'Type': 'AWS::Lambda::Permission', 'Properties': {
        'Action': 'lambda:InvokeFunction', 'FunctionName': ref('Function'), 'Principal': 'apigateway.amazonaws.com',
        'SourceArn': {'Fn::Sub': 'arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/GET/github/*'},
    }},
}
for name, path in [('Import', '/github/import'), ('File', '/github/file')]:
    resources[name + 'Route'] = {'Type': 'AWS::ApiGatewayV2::Route', 'Properties': {
        'ApiId': ref('ApiId'), 'RouteKey': 'GET ' + path, 'AuthorizationType': 'JWT',
        'AuthorizerId': ref('AuthorizerId'), 'AuthorizationScopes': ['openid'],
        'Target': {'Fn::Sub': 'integrations/${Integration}'},
    }}
template = {
    'AWSTemplateFormatVersion': '2010-09-09',
    'Description': 'ONEORIGIN read-only GitHub App import; no build execution or credential writes',
    'Parameters': {
        'ApiId': {'Type': 'String', 'Default': '7a158myew1', 'AllowedPattern': '[a-z0-9]+'},
        'AuthorizerId': {'Type': 'String', 'Default': 'degdgd', 'AllowedPattern': '[a-z0-9]+'},
        'GitHubSecretArn': {'Type': 'String', 'Default': 'arn:aws:secretsmanager:ap-southeast-1:973750561506:secret:origin/github-app-77vYaV',
            'AllowedPattern': 'arn:aws:secretsmanager:ap-southeast-1:973750561506:secret:origin/github-app-[A-Za-z0-9]+'},
        'AllowedRepositories': {'Type': 'String', 'Default': 'examplessdk-lgtm/1origin,examplessdk-lgtm/OriginStarter-Template',
            'AllowedPattern': '[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:,[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)*'},
    },
    'Resources': resources,
    'Outputs': {'FunctionName': {'Value': ref('Function')}, 'LogGroup': {'Value': ref('Logs')}},
}
(ROOT / 'infra/aws/github-app-import.cloudformation.json').write_text(json.dumps(template, indent=2) + '\n')
