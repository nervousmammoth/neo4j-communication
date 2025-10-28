#!/usr/bin/env node

/**
 * Update Avatar URLs to Professional Style
 * 
 * This script updates all user avatar URLs in the Neo4j database
 * from the colorful "avataaars" style to a professional "initials" style
 * with a black and white/grayscale color scheme.
 * 
 * Before: https://api.dicebear.com/7.x/avataaars/svg?seed=123
 * After:  https://api.dicebear.com/7.x/initials/svg?seed=UserName&backgroundColor=...
 */

const neo4j = require('neo4j-driver');

// Neo4j connection configuration (same as seed-data.js)
const NEO4J_URI = process.env.NEO4J_01_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_01_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_01_PASSWORD || 'changeme123';

// Initialize Neo4j driver
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

/**
 * Update all user avatars to professional style
 */
async function updateAvatars() {
  const session = driver.session();
  
  try {
    console.log('🔄 Updating avatar URLs to professional style...\n');
    
    // First, let's see how many users we have
    const countResult = await session.run('MATCH (u:User) RETURN count(u) as userCount');
    const userCount = countResult.records[0].get('userCount').toNumber();
    console.log(`📊 Found ${userCount} users to update\n`);
    
    // Update all avatar URLs to use the initials style with grayscale colors
    // backgroundColor: Various shades of gray from light to medium
    // textColor: Dark gray for good contrast
    const updateResult = await session.run(`
      MATCH (u:User)
      SET u.avatarUrl = 
        'https://api.dicebear.com/7.x/initials/svg?seed=' + u.name + 
        '&backgroundColor=e0e0e0,bdbdbd,9e9e9e,757575,616161&textColor=212121&fontSize=45'
      RETURN count(u) as updatedUsers
    `);
    
    const updatedUsers = updateResult.records[0].get('updatedUsers').toNumber();
    console.log(`✅ Successfully updated ${updatedUsers} user avatars!\n`);
    
    // Show a sample of the new URLs
    console.log('📸 Sample of new avatar URLs:');
    const sampleResult = await session.run(`
      MATCH (u:User)
      RETURN u.name as name, u.avatarUrl as avatarUrl
      LIMIT 5
    `);
    
    sampleResult.records.forEach(record => {
      const name = record.get('name');
      const url = record.get('avatarUrl');
      console.log(`   ${name}: ${url.substring(0, 80)}...`);
    });
    
    console.log('\n🎉 Avatar update complete! Refresh your application to see the changes.');
    console.log('💡 The avatars now show user initials in a professional grayscale style.\n');
    
  } catch (error) {
    console.error('❌ Error updating avatars:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run the update
updateAvatars().catch(console.error);