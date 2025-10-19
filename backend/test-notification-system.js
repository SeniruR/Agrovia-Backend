const { pool } = require('./config/database');
const Notification = require('./models/Notification');

async function testNotificationSystem() {
  try {
    console.log('🧪 Testing Notification System...\n');

    // Step 1: Get farmers with type 1.1
    console.log('Step 1: Finding farmers with type 1.1...');
    const [farmers] = await pool.execute(
      'SELECT id, full_name FROM users WHERE user_type = ? AND is_active = 1 LIMIT 5',
      ['1.1']
    );
    
    if (farmers.length === 0) {
      console.log('❌ No farmers found with type 1.1');
      return;
    }
    
    console.log(`✅ Found ${farmers.length} farmers:`, farmers.map(f => `${f.id}(${f.full_name})`));
    
    // Step 2: Create a test notification
    console.log('\nStep 2: Creating test notification...');
    const notificationId = await Notification.create(
      'Test Pest Alert',
      'This is a test notification for pest alert system',
      'pest_alert'
    );
    
    console.log(`✅ Notification created with ID: ${notificationId}`);
    
    // Step 3: Add recipients
    console.log('\nStep 3: Adding recipients...');
    const farmerIds = farmers.map(f => f.id);
    await Notification.addRecipients(notificationId, farmerIds);
    
    // Step 4: Verify the data was stored
    console.log('\nStep 4: Verifying stored data...');
    
    // Check notification
    const [notificationCheck] = await pool.execute(
      'SELECT * FROM notifications WHERE id = ?',
      [notificationId]
    );
    console.log('📋 Notification in database:', notificationCheck[0]);
    
    // Check recipients
    const [recipientCheck] = await pool.execute(
      'SELECT nr.*, u.full_name FROM notification_recipients nr JOIN users u ON nr.userId = u.id WHERE notificationId = ?',
      [notificationId]
    );
    console.log(`👥 Recipients in database (${recipientCheck.length}):`, recipientCheck);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testNotificationSystem();