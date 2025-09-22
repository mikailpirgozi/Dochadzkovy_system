#!/usr/bin/env node

/**
 * 🔔 Push Notification Test Script - Dochádzka Pro
 * Testuje push notifikácie na reálnom zariadení
 */

const https = require('https');

// Test push notification data
const testNotifications = [
  {
    title: "Dochádzka Pro - Test",
    body: "Test push notifikácie funguje! 🎉",
    data: { type: "test", timestamp: Date.now() }
  },
  {
    title: "Pripomenutie prestávky",
    body: "Je čas na prestávku. Nezabudni si ju označiť v aplikácii.",
    data: { type: "break_reminder", timestamp: Date.now() }
  },
  {
    title: "Koniec pracovného dňa",
    body: "Pracovný deň sa končí. Nezabudni sa odhlásit.",
    data: { type: "workday_end", timestamp: Date.now() }
  },
  {
    title: "Geofence Alert",
    body: "Opustil si pracovisko. Nezabudni sa odhlásit ak si skončil prácu.",
    data: { type: "geofence_exit", timestamp: Date.now() }
  }
];

/**
 * Send push notification via Expo Push API
 */
async function sendPushNotification(pushToken, notification) {
  const message = {
    to: pushToken,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data,
    priority: 'high',
    channelId: 'attendance-notifications'
  };

  const postData = JSON.stringify(message);

  const options = {
    hostname: 'exp.host',
    port: 443,
    path: '/--/api/v2/push/send',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main test function
 */
async function testPushNotifications() {
  console.log('🔔 Push Notification Test Script - Dochádzka Pro\n');

  // Get push token from command line argument
  const pushToken = process.argv[2];

  if (!pushToken) {
    console.log('❌ Error: Push token is required');
    console.log('\n📱 How to get push token:');
    console.log('1. Install the app on your device');
    console.log('2. Login and go to Settings');
    console.log('3. Copy the push token from debug info');
    console.log('4. Run: node test-push-notifications.js ExponentPushToken[your-token-here]');
    console.log('\n💡 Example:');
    console.log('node test-push-notifications.js ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');
    process.exit(1);
  }

  console.log(`📱 Testing push notifications for token: ${pushToken.substring(0, 30)}...`);
  console.log('');

  // Test each notification type
  for (let i = 0; i < testNotifications.length; i++) {
    const notification = testNotifications[i];
    
    try {
      console.log(`📤 Sending: "${notification.title}"`);
      const response = await sendPushNotification(pushToken, notification);
      
      if (response.data && response.data.status === 'ok') {
        console.log(`✅ Success: ${notification.title}`);
      } else {
        console.log(`❌ Failed: ${notification.title}`, response);
      }
      
      // Wait 2 seconds between notifications
      if (i < testNotifications.length - 1) {
        console.log('⏳ Waiting 2 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log(`❌ Error sending "${notification.title}":`, error.message);
    }
  }

  console.log('\n🎉 Push notification test completed!');
  console.log('\n📱 Check your device for notifications.');
  console.log('💡 If notifications don\'t appear:');
  console.log('  1. Check notification permissions in device settings');
  console.log('  2. Make sure the app is installed and logged in');
  console.log('  3. Verify the push token is correct');
}

/**
 * Interactive mode - get push token from user
 */
function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🔔 Push Notification Test - Interactive Mode\n');
  console.log('📱 To get your push token:');
  console.log('1. Open Dochádzka Pro app on your device');
  console.log('2. Login with your account');
  console.log('3. Go to Settings → Debug Info');
  console.log('4. Copy the "Push Token" value\n');

  rl.question('📝 Enter your push token (ExponentPushToken[...]): ', async (token) => {
    rl.close();
    
    if (!token || !token.startsWith('ExponentPushToken[')) {
      console.log('❌ Invalid push token format');
      console.log('💡 Token should start with: ExponentPushToken[');
      process.exit(1);
    }

    // Set token and run tests
    process.argv[2] = token;
    await testPushNotifications();
  });
}

// Run the script
if (require.main === module) {
  if (process.argv[2]) {
    testPushNotifications().catch(console.error);
  } else {
    interactiveMode();
  }
}

module.exports = { sendPushNotification, testPushNotifications };
