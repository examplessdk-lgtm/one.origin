"""Render deployable CloudFormation with inline Lambda sources; no secret/account ids."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def ref(value): return {'Ref': value}
def attr(name, value): return {'Fn::GetAtt': [name, value]}
def sub(value): return {'Fn::Sub': value}
def policy(actions, resources): return {'Effect': 'Allow', 'Action': actions, 'Resource': resources}
def role(statements):
    return {'Type': 'AWS::IAM::Role', 'Properties': {'AssumeRolePolicyDocument': {'Version': '2012-10-17','Statement':[{'Effect':'Allow','Principal':{'Service':'lambda.amazonaws.com'},'Action':'sts:AssumeRole'}]}, 'Policies':[{'PolicyName':'OriginScopedAccess','PolicyDocument':{'Version':'2012-10-17','Statement':statements}}]}}

template = {'AWSTemplateFormatVersion':'2010-09-09','Description':'Origin control plane foundation; does not execute or host customer builds.', 'Parameters': {
    'WebOrigin': {'Type':'String','Default':'https://1origin.dev','AllowedPattern':r'https://[A-Za-z0-9.-]+(?::[0-9]+)?'},
    'CognitoDomainPrefix':{'Type':'String','MinLength':3,'MaxLength':63,'AllowedPattern':'[a-z0-9-]+'}}, 'Resources':{}}
r = template['Resources']
r['Data'] = {'Type':'AWS::DynamoDB::Table','DeletionPolicy':'Retain','UpdateReplacePolicy':'Retain','Properties':{'BillingMode':'PAY_PER_REQUEST','AttributeDefinitions':[{'AttributeName':n,'AttributeType':'S'} for n in ['pk','sk']], 'KeySchema':[{'AttributeName':'pk','KeyType':'HASH'},{'AttributeName':'sk','KeyType':'RANGE'}], 'SSESpecification':{'SSEEnabled':True},'PointInTimeRecoverySpecification':{'PointInTimeRecoveryEnabled':True}, 'StreamSpecification':{'StreamViewType':'NEW_IMAGE'}}}
for name in ['DeadLetters','BuildQueue','StreamFailures']:
    r[name]={'Type':'AWS::SQS::Queue','Properties':{'SqsManagedSseEnabled':True,'MessageRetentionPeriod':1209600}}
r['BuildQueue']['Properties'].update({'VisibilityTimeout':180,'RedrivePolicy':{'deadLetterTargetArn':attr('DeadLetters','Arn'),'maxReceiveCount':5}})
for name in ['ApiLogs','DispatchLogs']:
    r[name]={'Type':'AWS::Logs::LogGroup','Properties':{'RetentionInDays':30}}
log_statements = lambda name: policy(['logs:CreateLogStream','logs:PutLogEvents'],[attr(name, 'Arn')])
r['ApiRole']=role([log_statements('ApiLogs'),policy(['dynamodb:GetItem','dynamodb:PutItem','dynamodb:Query'],[attr('Data','Arn')])])
r['DispatchRole']=role([log_statements('DispatchLogs'),policy(['dynamodb:DescribeStream','dynamodb:GetRecords','dynamodb:GetShardIterator'],[attr('Data','StreamArn')]),policy(['dynamodb:ListStreams'],['*']),policy(['sqs:SendMessage'],[attr('BuildQueue','Arn'),attr('StreamFailures','Arn')])])
for name, source, iam, logs, env in [('ApiFunction','api.py','ApiRole','ApiLogs',{'TABLE_NAME':ref('Data'),'BUILDS_ENABLED':'false'}),('DispatchFunction','dispatcher.py','DispatchRole','DispatchLogs',{'QUEUE_URL':ref('BuildQueue')})]:
    r[name]={'Type':'AWS::Lambda::Function','Properties':{'Runtime':'python3.12','Handler':'index.handler','Role':attr(iam,'Arn'),'Timeout':20,'MemorySize':256,'Code':{'ZipFile':(ROOT/'backend'/source).read_text()},'LoggingConfig':{'LogGroup':ref(logs)},'Environment':{'Variables':env}}}
r['OutboxStream']={'Type':'AWS::Lambda::EventSourceMapping','Properties':{'EventSourceArn':attr('Data','StreamArn'),'FunctionName':ref('DispatchFunction'),'StartingPosition':'TRIM_HORIZON','BatchSize':10,'MaximumRetryAttempts':10,'BisectBatchOnFunctionError':True,'FunctionResponseTypes':['ReportBatchItemFailures'],'DestinationConfig':{'OnFailure':{'Destination':attr('StreamFailures','Arn')}},'FilterCriteria':{'Filters':[{'Pattern':json.dumps({'eventName':['INSERT'],'dynamodb':{'NewImage':{'sk':{'S':[{'prefix':'OUTBOX#'}]}}}})}]}}}
r['Users']={'Type':'AWS::Cognito::UserPool','Properties':{'AdminCreateUserConfig':{'AllowAdminCreateUserOnly':True},'UsernameAttributes':['email'],'AutoVerifiedAttributes':['email'],'Policies':{'PasswordPolicy':{'MinimumLength':12,'RequireLowercase':True,'RequireUppercase':True,'RequireNumbers':True,'RequireSymbols':True}},'UserPoolAddOns':{'AdvancedSecurityMode':'OFF'}}}
r['UserClient']={'Type':'AWS::Cognito::UserPoolClient','Properties':{'UserPoolId':ref('Users'),'GenerateSecret':False,'AllowedOAuthFlowsUserPoolClient':True,'AllowedOAuthFlows':['code'],'AllowedOAuthScopes':['openid','email'],'SupportedIdentityProviders':['COGNITO'],'CallbackURLs':[sub('${WebOrigin}/connect')],'LogoutURLs':[sub('${WebOrigin}/connect')],'EnableTokenRevocation':True,'PreventUserExistenceErrors':'ENABLED','AccessTokenValidity':15,'IdTokenValidity':15,'RefreshTokenValidity':1,'TokenValidityUnits':{'AccessToken':'minutes','IdToken':'minutes','RefreshToken':'days'}}}
r['UserDomain']={'Type':'AWS::Cognito::UserPoolDomain','Properties':{'Domain':ref('CognitoDomainPrefix'),'UserPoolId':ref('Users')}}
r['Api']={'Type':'AWS::ApiGatewayV2::Api','Properties':{'ProtocolType':'HTTP','CorsConfiguration':{'AllowOrigins':[ref('WebOrigin')],'AllowMethods':['GET','POST'],'AllowHeaders':['Authorization','Content-Type'],'MaxAge':600}}}
r['Stage']={'Type':'AWS::ApiGatewayV2::Stage','Properties':{'ApiId':ref('Api'),'StageName':'$default','AutoDeploy':True,'DefaultRouteSettings':{'ThrottlingBurstLimit':10,'ThrottlingRateLimit':5}}}
r['Integration']={'Type':'AWS::ApiGatewayV2::Integration','Properties':{'ApiId':ref('Api'),'IntegrationType':'AWS_PROXY','IntegrationUri':attr('ApiFunction','Arn'),'PayloadFormatVersion':'2.0'}}
r['Authorizer']={'Type':'AWS::ApiGatewayV2::Authorizer','Properties':{'ApiId':ref('Api'),'Name':'CognitoAccessToken','AuthorizerType':'JWT','IdentitySource':['$request.header.Authorization'],'JwtConfiguration':{'Audience':[ref('UserClient')],'Issuer':sub('https://cognito-idp.${AWS::Region}.amazonaws.com/${Users}')}}}
for name, route in [('ProjectsGet','GET /projects'),('ProjectsPost','POST /projects'),('DeploymentsGet','GET /projects/{id}/deployments'),('DeploymentsPost','POST /projects/{id}/deployments'),('Health','GET /health')]:
    props={'ApiId':ref('Api'),'RouteKey':route,'Target':{'Fn::Join':['/', ['integrations',ref('Integration')]]}}
    if name != 'Health': props.update({'AuthorizationType':'JWT','AuthorizerId':ref('Authorizer'),'AuthorizationScopes':['openid']})
    r[name]={'Type':'AWS::ApiGatewayV2::Route','Properties':props}
r['InvokePermission']={'Type':'AWS::Lambda::Permission','Properties':{'Action':'lambda:InvokeFunction','FunctionName':ref('ApiFunction'),'Principal':'apigateway.amazonaws.com','SourceArn':sub('arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${Api}/*')}}
template['Outputs']={'ApiUrl':{'Value':attr('Api','ApiEndpoint')},'UserPoolId':{'Value':ref('Users')},'ClientId':{'Value':ref('UserClient')},'LoginDomain':{'Value':sub('https://${CognitoDomainPrefix}.auth.${AWS::Region}.amazoncognito.com')},'BuildQueueUrl':{'Value':ref('BuildQueue')}}
(ROOT/'infrastructure'/'control-plane.json').write_text(json.dumps(template,indent=2)+'\n')
