#!/usr/bin/env node
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const NEO4J_URI = process.env.NEO4J_01_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_01_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_01_PASSWORD || 'changeme123';

async function createIndexes() {
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
  );

  const session = driver.session();

  try {
    console.log('🔧 Creating Neo4j indexes for Issue #014a...\n');

    // Define all indexes to create
    const indexes = [
      {
        name: 'user_id_idx',
        query: 'CREATE INDEX user_id_idx IF NOT EXISTS FOR (u:User) ON (u.userId)',
        description: 'Critical index for user lookup performance'
      },
      {
        name: 'conversation_id_idx',
        query: 'CREATE INDEX conversation_id_idx IF NOT EXISTS FOR (c:Conversation) ON (c.conversationId)',
        description: 'Index for conversation lookups'
      },
      {
        name: 'message_id_idx',
        query: 'CREATE INDEX message_id_idx IF NOT EXISTS FOR (m:Message) ON (m.messageId)',
        description: 'Index for message lookups'
      },
      {
        name: 'message_sender_idx',
        query: 'CREATE INDEX message_sender_idx IF NOT EXISTS FOR (m:Message) ON (m.senderId)',
        description: 'Performance index for filtering messages by sender'
      },
      {
        name: 'message_timestamp_idx',
        query: 'CREATE INDEX message_timestamp_idx IF NOT EXISTS FOR (m:Message) ON (m.timestamp)',
        description: 'Performance index for sorting messages by time'
      },
      {
        name: 'conversation_last_msg_idx',
        query: 'CREATE INDEX conversation_last_msg_idx IF NOT EXISTS FOR (c:Conversation) ON (c.lastMessageTimestamp)',
        description: 'Performance index for sorting conversations'
      }
    ];

    // Create each index
    for (const index of indexes) {
      console.log(`Creating ${index.name}: ${index.description}`);
      try {
        await session.run(index.query);
        console.log(`✅ ${index.name} created successfully\n`);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`ℹ️  ${index.name} already exists\n`);
        } else {
          console.error(`❌ Failed to create ${index.name}: ${error.message}\n`);
        }
      }
    }

    // Verify all indexes are active
    console.log('📊 Verifying indexes...\n');
    const result = await session.run('SHOW INDEXES');
    
    const activeIndexes = result.records.map(record => ({
      name: record.get('name'),
      state: record.get('state'),
      labelsOrTypes: record.get('labelsOrTypes'),
      properties: record.get('properties')
    }));

    console.log('Active indexes:');
    console.log('---------------');
    
    // Check for our specific indexes
    const requiredIndexes = indexes.map(i => i.name);
    const foundIndexes: string[] = [];
    
    activeIndexes.forEach(idx => {
      if (requiredIndexes.includes(idx.name)) {
        console.log(`✅ ${idx.name}: ${idx.state} - ${idx.labelsOrTypes} on ${idx.properties}`);
        foundIndexes.push(idx.name);
      }
    });

    // Check if all required indexes exist
    const missingIndexes = requiredIndexes.filter(name => !foundIndexes.includes(name));
    
    if (missingIndexes.length > 0) {
      console.log('\n⚠️  Missing indexes:', missingIndexes.join(', '));
      console.log('Please check Neo4j logs for any errors.');
    } else {
      console.log('\n✅ All required indexes are present and active!');
    }

    // Test query performance
    console.log('\n🚀 Testing query performance...\n');
    
    // Test user lookup
    const startUser = Date.now();
    await session.run('MATCH (u:User {userId: "user-001"}) RETURN u LIMIT 1');
    const userTime = Date.now() - startUser;
    console.log(`User lookup: ${userTime}ms`);
    
    // Test message filtering
    const startMessage = Date.now();
    await session.run('MATCH (m:Message {senderId: "user-001"}) RETURN m LIMIT 10');
    const messageTime = Date.now() - startMessage;
    console.log(`Message filter by sender: ${messageTime}ms`);
    
    // Test conversation sorting
    const startConv = Date.now();
    await session.run('MATCH (c:Conversation) RETURN c ORDER BY c.lastMessageTimestamp DESC LIMIT 10');
    const convTime = Date.now() - startConv;
    console.log(`Conversation sorting: ${convTime}ms`);
    
    console.log('\n✨ Index creation complete!');

  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run the script
createIndexes().catch(console.error);