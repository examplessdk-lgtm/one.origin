"""Render trusted public-repository preview stack; this script does not deploy."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def ref(name): return {'Ref':name}
def get(name, attr): return {'Fn::GetAtt':[name,attr]}
def sub(value): return {'Fn::Sub':value}
def role(service, statements):
    return {'Type':'AWS::IAM::Role','Properties':{
        'AssumeRolePolicyDocument':{'Version':'2012-10-17','Statement':[{'Effect':'Allow','Principal':{'Service':service},'Action':'sts:AssumeRole'}]},
        'Policies':[{'PolicyName':'ScopedPreviewAccess','PolicyDocument':{'Version':'2012-10-17','Statement':statements}}]}}
def allow(actions, resource): return {'Effect':'Allow','Action':actions,'Resource':resource}
buildspec = {'version':'0.2','phases':{
    'install':{'runtime-versions':{'nodejs':22},'commands':[
        "set -eu",
        "node -e 'if(!/^[a-f0-9]{40}$/.test(process.env.COMMIT_SHA||\"\") || !/^[a-f0-9-]{36}$/.test(process.env.PREVIEW_ID||\"\")) process.exit(1)'",
        'git init source',
        'git -C source remote add origin https://github.com/examplessdk-lgtm/1origin.git',
        'git -C source fetch --depth=1 origin "$COMMIT_SHA"',
        'git -C source checkout --detach FETCH_HEAD',
        'test "$(git -C source rev-parse HEAD)" = "$COMMIT_SHA"',
        'cd source/ui/nuxt',
        'npm ci --no-audit --no-fund']},
    'build':{'commands':['NUXT_APP_BASE_URL="/previews/$PREVIEW_ID/" npm run generate', 'test -s .output/public/index.html']},
    'post_build':{'commands':['test "$CODEBUILD_BUILD_SUCCEEDING" = "1"']}},
    'artifacts':{'base-directory':'source/ui/nuxt/.output/public','files':['**/*'],'discard-paths':'no'}}
resources = {
    'Bucket':{'Type':'AWS::S3::Bucket','DeletionPolicy':'Retain','UpdateReplacePolicy':'Retain','Properties':{
        'PublicAccessBlockConfiguration':{k:True for k in ['BlockPublicAcls','IgnorePublicAcls','BlockPublicPolicy','RestrictPublicBuckets']},
        'BucketEncryption':{'ServerSideEncryptionConfiguration':[{'ServerSideEncryptionByDefault':{'SSEAlgorithm':'AES256'}}]},
        'OwnershipControls':{'Rules':[{'ObjectOwnership':'BucketOwnerEnforced'}]},
        'LifecycleConfiguration':{'Rules':[{'Id':'ExpirePreviews','Status':'Enabled','Prefix':'previews/','ExpirationInDays':7,'AbortIncompleteMultipartUpload':{'DaysAfterInitiation':1}}]}}},
    'OAC':{'Type':'AWS::CloudFront::OriginAccessControl','Properties':{'OriginAccessControlConfig':{'Name':sub('${AWS::StackName}-preview'),'OriginAccessControlOriginType':'s3','SigningBehavior':'always','SigningProtocol':'sigv4'}}},
    'PrettyUrls':{'Type':'AWS::CloudFront::Function','Properties':{'Name':sub('${AWS::StackName}-paths'),'AutoPublish':True,'FunctionConfig':{'Comment':'Preview directory indexes','Runtime':'cloudfront-js-2.0'},'FunctionCode':"function handler(event) { var r = event.request; if (r.uri.endsWith('/')) r.uri += 'index.html'; else if (!r.uri.split('/').pop().includes('.')) r.uri += '/index.html'; return r; }"}},
    'Headers':{'Type':'AWS::CloudFront::ResponseHeadersPolicy','Properties':{'ResponseHeadersPolicyConfig':{'Name':sub('${AWS::StackName}-headers'),'CustomHeadersConfig':{'Items':[{'Header':'X-Robots-Tag','Value':'noindex, nofollow','Override':True}]},'SecurityHeadersConfig':{'ContentTypeOptions':{'Override':True},'FrameOptions':{'FrameOption':'DENY','Override':True},'ReferrerPolicy':{'ReferrerPolicy':'no-referrer','Override':True}}}}},
    'Distribution':{'Type':'AWS::CloudFront::Distribution','Properties':{'DistributionConfig':{
        'Enabled':True,'HttpVersion':'http2and3','PriceClass':'PriceClass_100',
        'Origins':[{'Id':'preview','DomainName':get('Bucket','RegionalDomainName'),'OriginAccessControlId':ref('OAC'),'S3OriginConfig':{'OriginAccessIdentity':''}}],
        'DefaultCacheBehavior':{'TargetOriginId':'preview','ViewerProtocolPolicy':'redirect-to-https','AllowedMethods':['GET','HEAD'],'CachedMethods':['GET','HEAD'],'Compress':True,
            'CachePolicyId':'658327ea-f89d-4fab-a63d-7e88639e58f6','ResponseHeadersPolicyId':ref('Headers'),
            'FunctionAssociations':[{'EventType':'viewer-request','FunctionARN':get('PrettyUrls','FunctionARN')}]}}}},
    'BucketPolicy':{'Type':'AWS::S3::BucketPolicy','Properties':{'Bucket':ref('Bucket'),'PolicyDocument':{'Version':'2012-10-17','Statement':[
        {'Effect':'Allow','Principal':{'Service':'cloudfront.amazonaws.com'},'Action':'s3:GetObject','Resource':sub('${Bucket.Arn}/previews/*'),'Condition':{'StringEquals':{'AWS:SourceArn':sub('arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${Distribution}')}}},
        {'Effect':'Deny','Principal':'*','Action':'s3:*','Resource':[get('Bucket','Arn'),sub('${Bucket.Arn}/*')],'Condition':{'Bool':{'aws:SecureTransport':'false'}}}]}}},
    'LogKey':{'Type':'AWS::KMS::Key','Properties':{'EnableKeyRotation':True,'KeyPolicy':{'Version':'2012-10-17','Statement':[
        {'Effect':'Allow','Principal':{'AWS':sub('arn:${AWS::Partition}:iam::${AWS::AccountId}:root')},'Action':'kms:*','Resource':'*'},
        {'Effect':'Allow','Principal':{'Service':sub('logs.${AWS::Region}.amazonaws.com')},'Action':['kms:Encrypt','kms:Decrypt','kms:ReEncrypt*','kms:GenerateDataKey*','kms:DescribeKey'],'Resource':'*','Condition':{'ArnLike':{'kms:EncryptionContext:aws:logs:arn':sub('arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/origin/${AWS::StackName}/*')}}}]}}},
    'BuildLogs':{'Type':'AWS::Logs::LogGroup','Properties':{'LogGroupName':sub('/origin/${AWS::StackName}/build'),'RetentionInDays':7,'KmsKeyId':get('LogKey','Arn')}},
    'ApiLogs':{'Type':'AWS::Logs::LogGroup','Properties':{'LogGroupName':sub('/origin/${AWS::StackName}/api'),'RetentionInDays':7,'KmsKeyId':get('LogKey','Arn')}},
    'BuildRole':role('codebuild.amazonaws.com',[
        allow(['logs:CreateLogStream','logs:PutLogEvents'],get('BuildLogs','Arn')),
        allow(['s3:GetBucketAcl','s3:GetBucketLocation'],get('Bucket','Arn')),
        allow(['s3:PutObject'],sub('${Bucket.Arn}/previews/*'))]),
    'Project':{'Type':'AWS::CodeBuild::Project','Properties':{'ServiceRole':get('BuildRole','Arn'),
        'Source':{'Type':'NO_SOURCE','BuildSpec':json.dumps(buildspec)},
        'Artifacts':{'Type':'S3','Location':ref('Bucket'),'Path':'previews','Name':'unassigned','NamespaceType':'NONE','Packaging':'NONE','EncryptionDisabled':True},
        'Environment':{'Type':'LINUX_CONTAINER','ComputeType':'BUILD_GENERAL1_SMALL','Image':'aws/codebuild/standard:7.0','PrivilegedMode':False},
        'ConcurrentBuildLimit':1,'TimeoutInMinutes':15,'QueuedTimeoutInMinutes':5,
        'LogsConfig':{'CloudWatchLogs':{'Status':'ENABLED','GroupName':ref('BuildLogs')}}}},
    'ApiRole':role('lambda.amazonaws.com',[
        allow(['lambda:InvokeFunction'],sub('arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:${BrokerFunction}')),
        allow(['codebuild:StartBuild','codebuild:BatchGetBuilds','codebuild:ListBuildsForProject'],get('Project','Arn')),
        allow(['logs:GetLogEvents'],get('BuildLogs','Arn')),
        allow(['logs:CreateLogStream','logs:PutLogEvents'],get('ApiLogs','Arn'))]),
    'Function':{'Type':'AWS::Lambda::Function','Properties':{'Runtime':'nodejs22.x','Handler':'index.handler','MemorySize':256,'Timeout':45,
        'Role':get('ApiRole','Arn'),'LoggingConfig':{'LogGroup':ref('ApiLogs')},
        'Environment':{'Variables':{'PROJECT':ref('Project'),'BROKER':ref('BrokerFunction'),'BUCKET':ref('Bucket'),'PREVIEW_DOMAIN':get('Distribution','DomainName')}},
        'Code':{'ZipFile':(ROOT/'backend/preview.cjs').read_text()}}},
    'Integration':{'Type':'AWS::ApiGatewayV2::Integration','Properties':{'ApiId':ref('ApiId'),'IntegrationType':'AWS_PROXY','IntegrationUri':get('Function','Arn'),'PayloadFormatVersion':'2.0','TimeoutInMillis':29000}},
    'Permission':{'Type':'AWS::Lambda::Permission','Properties':{'Action':'lambda:InvokeFunction','FunctionName':ref('Function'),'Principal':'apigateway.amazonaws.com','SourceArn':sub('arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*/previews*')}}
}
for name, route in [('Start','POST /previews'),('History','GET /previews'),('Logs','GET /previews/logs')]:
    resources[name+'Route']={'Type':'AWS::ApiGatewayV2::Route','Properties':{'ApiId':ref('ApiId'),'RouteKey':route,'AuthorizationType':'JWT','AuthorizerId':ref('AuthorizerId'),'AuthorizationScopes':['openid'],'Target':sub('integrations/${Integration}')}}
template={'AWSTemplateFormatVersion':'2010-09-09','Description':'Trusted 1origin public Nuxt preview pilot. Separate production storage and build role.',
    'Parameters':{'ApiId':{'Type':'String','Default':'7a158myew1','AllowedPattern':'[a-z0-9]+'},'AuthorizerId':{'Type':'String','Default':'degdgd','AllowedPattern':'[a-z0-9]+'},
        'BrokerFunction':{'Type':'String','Default':'origin-github-import-Function-ZMTn9XFLErld','AllowedPattern':'[A-Za-z0-9_-]+'}},
    'Resources':resources,'Outputs':{'PreviewDomain':{'Value':get('Distribution','DomainName')},'FunctionName':{'Value':ref('Function')},'ProjectName':{'Value':ref('Project')},'PreviewBucket':{'Value':ref('Bucket')}}}
(ROOT/'infra/aws/origin-preview.cloudformation.json').write_text(json.dumps(template,indent=2)+'\n')
