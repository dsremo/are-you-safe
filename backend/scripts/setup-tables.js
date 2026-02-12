/**
 * Creates all DynamoDB tables for Are You Safe?
 * Usage: AWS_REGION=ap-south-1 node scripts/setup-tables.js [--suffix=-staging]
 */

const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const region = process.env.AWS_REGION || 'ap-south-1';
const client = new DynamoDBClient({ region });
const suffix = process.argv.find(a => a.startsWith('--suffix='))?.split('=')[1] || '';

const tables = [
  {
    TableName: `AreYouSafe-Users${suffix}`,
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `AreYouSafe-Settings${suffix}`,
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `AreYouSafe-Contacts${suffix}`,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'contactId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'contactId', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `AreYouSafe-CheckIns${suffix}`,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'date', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'date', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `AreYouSafe-AlertLog${suffix}`,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'alertTimestamp', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'alertTimestamp', AttributeType: 'N' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

async function createTables() {
  console.log(`Creating tables in ${region} with suffix "${suffix}"...\n`);

  for (const table of tables) {
    try {
      // Check if exists
      await client.send(new DescribeTableCommand({ TableName: table.TableName }));
      console.log(`  ✓ ${table.TableName} already exists`);
    } catch (err) {
      if (err.name === 'ResourceNotFoundException') {
        await client.send(new CreateTableCommand(table));
        console.log(`  ✓ ${table.TableName} created`);
      } else {
        console.error(`  ✗ ${table.TableName} error:`, err.message);
      }
    }
  }

  console.log('\nDone!');
}

createTables().catch(console.error);
