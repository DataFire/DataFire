## 2.21.0

Add support for openapi_3

### 2.20.2

update momentjs

### 2.20.1

update tests

## 2.20.0

add ability to modify openapi requests

### 2.19.4

use json-schema-faker-bb to avoid git dependencies

### 2.19.3

use custom json-schema-faker to resolve randexp dependency

### 2.19.2

Update README.md

### 2.19.1

fix overeager error handler

add events for errors caught by swagger-middleware

## 2.19.0

allow definitions in integration constructor

add type to oauth output schema

add http and task event callbacks

refactor error events

### 2.18.3

check Open API method validity

### 2.18.2

add label to duration log

### 2.18.1

expose Event class

## 2.18.0

add oauth refresh event

### 2.17.1

oauth: update refresh token if applicable

better error message for OAuth token failures

## 2.17.0

add support for errorHandler

### 2.16.1

add warning for missing DataFire.yml

## 2.16.0

add support for data-monitoring in tasks

copy parameter defaults to JSON schema

build schema for body params when 'schema' field not present

## 2.15.0

allow setting a single account for an integration

## 2.14.0

allow host override for Open API integrations

allow 5-part expressions for cron

## 2.13.0

add fix for collectionFormat in Open API parameters

refactor project monitor

allow form-encoded bodies by default

### 2.12.1

add --raml, --wadl, etc options

## 2.12.0

Pretty error messages in project-server responses

## 2.11.0

Add variables field to DataFire.yml

### 2.10.1

don't compile schemas until they're needed

add better isResponse check than instanceof

## 2.10.0

add support for caching

use outputSchema.definitions for integration.getDetails()

add ajv util

## 2.9.0

datatfire integrate: create details.json

add 'datafire test' command

better logger.logSchema

allow null input for actions that take an object with no required props

don't set undefined params

change action order

add descriptions for oauth actions

add gzip/deflate encoding support

## 2.8.0

Support x-location in openapi security def

set OAuth flow preference order

### 2.7.1

better error reporting for 'datafire run'

## 2.7.0

add encoding option to datafire.Response

add x-datafire to operations

add support for extendPath

Show original error message for nested MODULE_NOT_FOUND

## 2.6.0

don't set security if there are no securityDefinitions

allow action and integration aliases in DataFire.yml

copy accounts passed into Context constructor

### 2.5.1

fix var declaration

## 2.5.0

extract inputSchema generation

add success status to HTTP events

add inputFile and outputFile arguments for action.run

## 2.4.0

add refresh_url option for accounts

Ensure Open API parameter names are unique, add required params to inputSchema.required

add oauthCallback and oauthRefresh actions

set AJV version at 4.11.5

Add 'context' warning to account-unspecified error message

## 2.3.0

allow access to the Express router in ProjectServer

### 2.2.3

datafire integrate: remove --save, require --name

### 2.2.2

keep results independent in each flow

remove path params from body schema

## 2.2.0

better error messages for YAML errors

add CORS option

fix instanceof check when DataFire versions are mismatched

add logo option to integrations

### 2.0.6

add security to action if it's not an empty array

use individual AJV instances to save memory

### 2.0.5

add approval_prompt=force for Google authorization

use non-implicit oauth if available

### 2.0.4

show redirect page on oauth finish

### 2.0.3

disable outputSchemas in generated openapi

### 2.0.2

update build/publish scripts

### 2.0.1

allow action to be plain JS object

## 2.0.0

initial release
