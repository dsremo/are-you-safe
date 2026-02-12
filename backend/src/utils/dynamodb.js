const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLES = {
  USERS: `AreYouSafe-Users${process.env.TABLE_SUFFIX || ''}`,
  SETTINGS: `AreYouSafe-Settings${process.env.TABLE_SUFFIX || ''}`,
  CONTACTS: `AreYouSafe-Contacts${process.env.TABLE_SUFFIX || ''}`,
  CHECKINS: `AreYouSafe-CheckIns${process.env.TABLE_SUFFIX || ''}`,
  ALERT_LOG: `AreYouSafe-AlertLog${process.env.TABLE_SUFFIX || ''}`,
};

async function getItem(table, key) {
  const result = await docClient.send(new GetCommand({ TableName: table, Key: key }));
  return result.Item || null;
}

async function putItem(table, item) {
  await docClient.send(new PutCommand({ TableName: table, Item: item }));
  return item;
}

async function updateItem(table, key, updates) {
  const expressions = [];
  const names = {};
  const values = {};

  Object.entries(updates).forEach(([field, value], i) => {
    expressions.push(`#f${i} = :v${i}`);
    names[`#f${i}`] = field;
    values[`:v${i}`] = value;
  });

  const result = await docClient.send(new UpdateCommand({
    TableName: table,
    Key: key,
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));
  return result.Attributes;
}

async function deleteItem(table, key) {
  await docClient.send(new DeleteCommand({ TableName: table, Key: key }));
}

async function queryItems(table, keyCondition, expressionValues, options = {}) {
  const params = {
    TableName: table,
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: expressionValues,
    ScanIndexForward: options.scanForward !== undefined ? options.scanForward : false,
  };
  if (options.limit) params.Limit = options.limit;
  if (options.indexName) params.IndexName = options.indexName;
  if (options.lastKey) params.ExclusiveStartKey = options.lastKey;

  const result = await docClient.send(new QueryCommand(params));
  return { items: result.Items || [], lastKey: result.LastEvaluatedKey || null };
}

async function scanTable(table, options = {}) {
  const params = { TableName: table };
  if (options.limit) params.Limit = options.limit;
  if (options.lastKey) params.ExclusiveStartKey = options.lastKey;
  if (options.filterExpression) {
    params.FilterExpression = options.filterExpression;
    params.ExpressionAttributeValues = options.expressionValues;
    if (options.expressionNames) params.ExpressionAttributeNames = options.expressionNames;
  }

  const result = await docClient.send(new ScanCommand(params));
  return { items: result.Items || [], lastKey: result.LastEvaluatedKey || null };
}

module.exports = { TABLES, getItem, putItem, updateItem, deleteItem, queryItems, scanTable };
