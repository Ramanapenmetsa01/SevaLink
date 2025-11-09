require('dotenv').config();
const { testEmailConfig, sendOTPEmail } = require('./utils/emailService');

async function testEmail() {
  console.log('🧪 Testing email configuration...');
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email Pass:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n❌ Email credentials not configured!');
    console.log('\n📋 To fix Gmail email issues:');
    console.log('1. Enable 2-Factor Authentication on your Gmail account');
    console.log('2. Generate an App Password: https://myaccount.google.com/apppasswords');
    console.log('3. Use the App Password (not your regular password) in EMAIL_PASS');
    console.log('4. Make sure EMAIL_USER is your full Gmail address');
    return;
  }

  // Test configuration
  const configTest = await testEmailConfig();
  if (configTest.success) {
    console.log('✅ Email configuration is valid');

    // Test sending OTP email
    console.log('\n📧 Testing OTP email...');
    const otpTest = await sendOTPEmail(process.env.EMAIL_USER, '123456', 'Test User');

    if (otpTest.success) {
      console.log('✅ OTP email sent successfully!');
      console.log('Message ID:', otpTest.messageId);
    } else {
      console.log('❌ Failed to send OTP email:', otpTest.error);
    }
  } else {
    console.log('❌ Email configuration failed:', configTest.error);
    console.log('\n📋 Gmail troubleshooting steps:');
    console.log('1. Check if 2-Factor Authentication is enabled');
    console.log('2. Generate a new App Password: https://myaccount.google.com/apppasswords');
    console.log('3. Update EMAIL_PASS in .env with the new App Password');
    console.log('4. Restart the server after updating .env');
  }
}

testEmail().then(() => {
  console.log('\n🏁 Email test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
