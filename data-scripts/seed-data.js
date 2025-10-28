#!/usr/bin/env node

/**
 * Seed Development Data for Neo4j Communication
 * 
 * Creates a reasonable dataset for development and testing:
 * - 150 users
 * - 1,500 conversations  
 * - ~157,500 messages (avg 105 messages per conversation)
 * 
 * This is sufficient for testing:
 * - Pagination and virtual scrolling
 * - Caching strategies
 * - Query performance
 * - UI responsiveness
 */

const neo4j = require('neo4j-driver');
const { faker } = require('@faker-js/faker');

// Neo4j connection configuration
const NEO4J_URI = process.env.NEO4J_01_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_01_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_01_PASSWORD || 'changeme123';

// Dataset configuration
const CONFIG = {
  users: 150,
  conversations: 1500,
  minMessagesPerConversation: 10,
  maxMessagesPerConversation: 200,
  minParticipantsPerConversation: 2,
  maxParticipantsPerConversation: 10,
  batchSize: 500
};

// Initialize Neo4j driver
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

/**
 * Clear existing data and create constraints/indexes
 */
async function setupDatabase() {
  const session = driver.session();
  
  try {
    console.log('🗑️  Clearing existing data...');
    await session.run('MATCH (n) DETACH DELETE n');
    
    console.log('🔧 Creating constraints and indexes...');
    
    // Create constraints (Neo4j 5.x syntax)
    const constraints = [
      'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE',
      'CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
      'CREATE CONSTRAINT conversation_id_unique IF NOT EXISTS FOR (c:Conversation) REQUIRE c.conversationId IS UNIQUE',
      'CREATE CONSTRAINT message_id_unique IF NOT EXISTS FOR (m:Message) REQUIRE m.messageId IS UNIQUE'
    ];
    
    for (const constraint of constraints) {
      try {
        await session.run(constraint);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.error(`Failed to create constraint: ${err.message}`);
        }
      }
    }
    
    // Create indexes for performance
    const indexes = [
      'CREATE INDEX user_id_idx IF NOT EXISTS FOR (u:User) ON (u.userId)',
      'CREATE INDEX message_timestamp_idx IF NOT EXISTS FOR (m:Message) ON (m.timestamp)',
      'CREATE INDEX message_sender_idx IF NOT EXISTS FOR (m:Message) ON (m.senderId)',
      'CREATE INDEX conversation_timestamp_idx IF NOT EXISTS FOR (c:Conversation) ON (c.lastMessageTimestamp)'
    ];
    
    for (const index of indexes) {
      try {
        await session.run(index);
      } catch (err) {
        console.error(`Failed to create index: ${err.message}`);
      }
    }
    
    console.log('✅ Database setup complete');
  } finally {
    await session.close();
  }
}

/**
 * Generate users
 */
async function generateUsers() {
  const session = driver.session();
  const users = [];
  
  console.log(`👥 Generating ${CONFIG.users} users...`);
  
  for (let i = 1; i <= CONFIG.users; i++) {
    const user = {
      userId: `user_${i}`,
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
      username: faker.internet.username(),
      status: faker.helpers.arrayElement(['online', 'offline', 'away', 'busy']),
      role: faker.helpers.arrayElement(['user', 'moderator', 'admin']),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${faker.person.fullName()}&backgroundColor=e0e0e0,bdbdbd,9e9e9e,757575,616161&textColor=212121&fontSize=45`,
      bio: faker.lorem.sentence(),
      lastSeen: faker.date.recent({ days: 7 }).toISOString(),
      department: faker.helpers.arrayElement(['Engineering', 'Sales', 'Marketing', 'Support', 'Product']),
      location: faker.location.city()
    };
    users.push(user);
  }
  
  // Batch insert users
  let tx;
  try {
    tx = session.beginTransaction();
    
    for (let i = 0; i < users.length; i += CONFIG.batchSize) {
      const batch = users.slice(i, i + CONFIG.batchSize);
      await tx.run(
        `UNWIND $users as user
         CREATE (u:User {
           userId: user.userId,
           email: user.email,
           name: user.name,
           username: user.username,
           status: user.status,
           role: user.role,
           avatarUrl: user.avatarUrl,
           bio: user.bio,
           lastSeen: user.lastSeen,
           department: user.department,
           location: user.location
         })`,
        { users: batch }
      );
      console.log(`  Created ${Math.min(i + CONFIG.batchSize, users.length)}/${CONFIG.users} users`);
    }
    
    await tx.commit();
    console.log('✅ Users created successfully');
  } catch (error) {
    if (tx) await tx.rollback();
    console.error('Error creating users:', error);
  } finally {
    await session.close();
  }
  
  return users;
}

/**
 * Generate conversations with participants
 */
async function generateConversations(users) {
  const session = driver.session();
  const conversations = [];
  
  console.log(`💬 Generating ${CONFIG.conversations} conversations...`);
  
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() - 3); // Start 3 months ago
  
  for (let i = 1; i <= CONFIG.conversations; i++) {
    // Determine number of participants
    const participantCount = faker.number.int({ 
      min: CONFIG.minParticipantsPerConversation, 
      max: Math.min(CONFIG.maxParticipantsPerConversation, users.length)
    });
    
    // Select random participants
    const participants = faker.helpers.arrayElements(users, participantCount);
    
    // Create conversation timestamp
    const createdAt = faker.date.between({ 
      from: baseDate, 
      to: new Date() 
    }).toISOString();
    
    const conversation = {
      conversationId: `conv_${i}`,
      title: faker.lorem.sentence({ min: 3, max: 8 }),
      type: participantCount === 2 ? 'direct' : 'group',
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      tags: faker.helpers.arrayElements(
        ['project', 'meeting', 'discussion', 'announcement', 'support', 'social', 'planning'],
        faker.number.int({ min: 1, max: 3 })
      ),
      createdAt: createdAt,
      lastMessageTimestamp: createdAt,
      lastMessagePreview: '',
      participantIds: participants.map(p => p.userId)
    };
    
    conversations.push(conversation);
  }
  
  // Batch insert conversations and relationships
  let tx;
  try {
    tx = session.beginTransaction();
    
    // Create conversations
    for (let i = 0; i < conversations.length; i += CONFIG.batchSize) {
      const batch = conversations.slice(i, i + CONFIG.batchSize);
      
      await tx.run(
        `UNWIND $conversations as conv
         CREATE (c:Conversation {
           conversationId: conv.conversationId,
           title: conv.title,
           type: conv.type,
           priority: conv.priority,
           tags: conv.tags,
           createdAt: conv.createdAt,
           lastMessageTimestamp: conv.lastMessageTimestamp,
           lastMessagePreview: conv.lastMessagePreview
         })`,
        { conversations: batch }
      );
      
      // Create participant relationships in a single query
      await tx.run(
        `UNWIND $conversations as conv
         MATCH (c:Conversation {conversationId: conv.conversationId})
         UNWIND conv.participantIds as participantId
         MATCH (u:User {userId: participantId})
         CREATE (u)-[:PARTICIPATES_IN]->(c)`,
        { conversations: batch }
      );
      
      console.log(`  Created ${Math.min(i + CONFIG.batchSize, conversations.length)}/${CONFIG.conversations} conversations`);
    }
    
    await tx.commit();
    console.log('✅ Conversations created successfully');
  } catch (error) {
    if (tx) await tx.rollback();
    console.error('Error creating conversations:', error);
  } finally {
    await session.close();
  }
  
  return conversations;
}

/**
 * Generate messages for conversations
 */
async function generateMessages(conversations, users) {
  const session = driver.session();
  let totalMessages = 0;
  
  console.log('📝 Generating messages for conversations...');
  
  const messageStatuses = ['sent', 'delivered', 'read'];
  const reactions = ['👍', '❤️', '😂', '🎉', '🤔', '👏'];
  
  // Create userMap for O(1) lookups
  const userMap = new Map(users.map(u => [u.userId, u]));
  
  for (let convIndex = 0; convIndex < conversations.length; convIndex++) {
    const conversation = conversations[convIndex];
    const participants = conversation.participantIds.map(id => userMap.get(id));
    
    // Determine number of messages for this conversation
    const messageCount = faker.number.int({ 
      min: CONFIG.minMessagesPerConversation, 
      max: CONFIG.maxMessagesPerConversation 
    });
    
    const messages = [];
    const convCreatedDate = new Date(conversation.createdAt);
    let lastTimestamp = convCreatedDate;
    
    for (let i = 1; i <= messageCount; i++) {
      // Increment timestamp
      lastTimestamp = faker.date.between({ 
        from: lastTimestamp, 
        to: new Date(Math.min(
          lastTimestamp.getTime() + 3600000, // Max 1 hour increment
          Date.now()
        ))
      });
      
      const sender = faker.helpers.arrayElement(participants);
      
      const message = {
        messageId: `msg_${conversation.conversationId}_${i}`,
        conversationId: conversation.conversationId,
        senderId: sender.userId,
        content: generateMessageContent(),
        timestamp: lastTimestamp.toISOString(),
        status: faker.helpers.arrayElement(messageStatuses),
        type: faker.helpers.weightedArrayElement([
          { value: 'text', weight: 80 },
          { value: 'image', weight: 5 },
          { value: 'file', weight: 5 },
          { value: 'link', weight: 5 },
          { value: 'code', weight: 5 }
        ]),
        reactions: faker.datatype.boolean({ probability: 0.1 }) 
          ? faker.helpers.arrayElements(reactions, faker.number.int({ min: 1, max: 3 }))
          : []
      };
      
      messages.push(message);
    }
    
    // Batch insert messages for this conversation
    let tx;
    try {
      tx = session.beginTransaction();
      
      for (let i = 0; i < messages.length; i += CONFIG.batchSize) {
        const batch = messages.slice(i, i + CONFIG.batchSize);
        
        await tx.run(
          `UNWIND $messages as msg
           CREATE (m:Message {
             messageId: msg.messageId,
             conversationId: msg.conversationId,
             senderId: msg.senderId,
             content: msg.content,
             timestamp: msg.timestamp,
             status: msg.status,
             type: msg.type,
             reactions: msg.reactions
           })
           WITH m
           MATCH (c:Conversation {conversationId: m.conversationId})
           CREATE (m)-[:BELONGS_TO]->(c)`,
          { messages: batch }
        );
      }
      
      // Update conversation with last message info
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        await tx.run(
          `MATCH (c:Conversation {conversationId: $conversationId})
           SET c.lastMessageTimestamp = $timestamp,
               c.lastMessagePreview = $preview`,
          { 
            conversationId: conversation.conversationId,
            timestamp: lastMessage.timestamp,
            preview: lastMessage.content.substring(0, 100)
          }
        );
      }
      
      await tx.commit();
      totalMessages += messages.length;
      
      if ((convIndex + 1) % 100 === 0 || convIndex === conversations.length - 1) {
        console.log(`  Processed ${convIndex + 1}/${conversations.length} conversations (${totalMessages} messages total)`);
      }
    } catch (error) {
      if (tx) await tx.rollback();
      console.error(`Error creating messages for conversation ${conversation.conversationId}:`, error);
    }
  }
  
  await session.close();
  console.log(`✅ Created ${totalMessages} messages successfully`);
  return totalMessages;
}

/**
 * Generate realistic message content
 */
function generateMessageContent() {
  const templates = [
    () => faker.lorem.sentence(),
    () => faker.lorem.paragraph({ min: 1, max: 3 }),
    () => `Hey, ${faker.lorem.sentence()}`,
    () => `I think ${faker.lorem.sentence()}`,
    () => `What about ${faker.lorem.words({ min: 3, max: 8 })}?`,
    () => faker.helpers.arrayElement(['Sure!', 'Sounds good', 'Let me check', 'I agree', 'Not sure about that']),
    () => `Can we ${faker.lorem.words({ min: 3, max: 6 })}?`,
    () => `Update: ${faker.lorem.sentence()}`,
    () => faker.company.catchPhrase(),
    () => `Working on ${faker.lorem.words({ min: 2, max: 5 })} now`
  ];
  
  return faker.helpers.arrayElement(templates)();
}

/**
 * Display database statistics
 */
async function displayStats() {
  const session = driver.session();
  
  try {
    console.log('\n📊 Database Statistics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const stats = await session.run(`
      MATCH (u:User)
      WITH count(u) as userCount
      MATCH (c:Conversation)
      WITH userCount, count(c) as convCount
      MATCH (m:Message)
      WITH userCount, convCount, count(m) as msgCount
      MATCH (:User)-[p:PARTICIPATES_IN]->(:Conversation)
      RETURN userCount, convCount, msgCount, count(p) as participations
    `);
    
    const result = stats.records[0];
    const userCount = result.get('userCount').toNumber();
    const convCount = result.get('convCount').toNumber();
    const msgCount = result.get('msgCount').toNumber();
    const participations = result.get('participations').toNumber();
    
    console.log(`👥 Users: ${userCount.toLocaleString()}`);
    console.log(`💬 Conversations: ${convCount.toLocaleString()}`);
    console.log(`📝 Messages: ${msgCount.toLocaleString()}`);
    console.log(`🔗 Participations: ${participations.toLocaleString()}`);
    console.log(`📈 Avg messages/conversation: ${Math.round(msgCount / convCount)}`);
    console.log(`👥 Avg participants/conversation: ${Math.round(participations / convCount)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } finally {
    await session.close();
  }
}

/**
 * Main execution
 */
async function main() {
  const avgMessagesPerConversation = Math.floor((CONFIG.minMessagesPerConversation + CONFIG.maxMessagesPerConversation) / 2);
  
  console.log('🚀 Neo4j Communication Database Seeding Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📦 Dataset Configuration:`);
  console.log(`  • Users: ${CONFIG.users}`);
  console.log(`  • Conversations: ${CONFIG.conversations}`);
  console.log(`  • Avg Messages/Conv: ${avgMessagesPerConversation}`);
  console.log(`  • Estimated Total Messages: ~${CONFIG.conversations * avgMessagesPerConversation}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Setup database
    await setupDatabase();
    
    // Generate data
    const users = await generateUsers();
    const conversations = await generateConversations(users);
    await generateMessages(conversations, users);
    
    // Display final statistics
    await displayStats();
    
    console.log('\n✨ Database seeding completed successfully!');
    console.log('🎯 You can now start the frontend with: cd frontend && npm run dev');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await driver.close();
  }
}

// Check if required modules are installed
try {
  require.resolve('neo4j-driver');
  require.resolve('@faker-js/faker');
} catch (e) {
  console.error('❌ Missing required dependencies!');
  console.error('Please run: npm install neo4j-driver @faker-js/faker');
  process.exit(1);
}

// Run the script
main().catch(console.error);