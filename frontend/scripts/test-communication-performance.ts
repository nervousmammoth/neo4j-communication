#!/usr/bin/env node
import { getUserCommunicationData } from '../lib/neo4j';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testPerformance() {
  console.log('🚀 Testing Communication API Performance...\n');

  const testCases = [
    { user1: 'user-001', user2: 'user-002', description: 'Users with many shared conversations' },
    { user1: 'user-001', user2: 'user-100', description: 'Users with few shared conversations' },
    { user1: 'user-001', user2: 'user-500', description: 'Users possibly with no shared conversations' },
  ];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.description}`);
    console.log(`Users: ${testCase.user1} <-> ${testCase.user2}`);
    
    const startTime = Date.now();
    
    try {
      const data = await getUserCommunicationData(testCase.user1, testCase.user2, {
        page: 1,
        limit: 50,
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Success in ${duration}ms`);
      console.log(`  - Shared conversations: ${data.sharedConversations.length}`);
      console.log(`  - Total messages: ${data.communicationStats.totalMessages}`);
      console.log(`  - Timeline messages: ${data.messageTimeline.length}`);
      
      if (duration > 500) {
        console.log(`⚠️  WARNING: Query took ${duration}ms (> 500ms threshold)`);
      }
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`❌ Failed in ${duration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('---\n');
  }

  // Test pagination performance
  console.log('Testing pagination performance...');
  const paginationStart = Date.now();
  
  try {
    // Test fetching page 10 with a small limit
    const data = await getUserCommunicationData('user-001', 'user-002', {
      page: 10,
      limit: 10,
    });
    
    const paginationEnd = Date.now();
    const paginationDuration = paginationEnd - paginationStart;
    
    console.log(`✅ Pagination test completed in ${paginationDuration}ms`);
    console.log(`  - Retrieved ${data.messageTimeline.length} messages from page 10`);
    
    if (paginationDuration > 500) {
      console.log(`⚠️  WARNING: Pagination query took ${paginationDuration}ms (> 500ms threshold)`);
    }
  } catch (error) {
    const paginationEnd = Date.now();
    const paginationDuration = paginationEnd - paginationStart;
    console.log(`❌ Pagination test failed in ${paginationDuration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('\n✨ Performance testing complete!');
  process.exit(0);
}

// Run the performance test
testPerformance().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});