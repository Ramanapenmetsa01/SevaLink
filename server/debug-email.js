require('dotenv').config();
const nodemailer = require('nodemailer');

async function debugEmail() {
  console.log('🔍 Debugging email configuration...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS length:', process.env.EMAIL_PASS?.length || 0);
  console.log('EMAIL_PASS (first 4 chars):', process.env.EMAIL_PASS?.substring(0, 4) + '...');

  // Test 1: Basic transporter creation
  console.log('\n📧 Test 1: Creating transporter...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    debug: true,
    logger: true
  });

  // Test 2: Verify connection
  console.log('\n🔗 Test 2: Verifying connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
  } catch (error) {
    console.log('❌ SMTP verification failed:', error.message);
    console.log('Full error:', error);
    
    // Provide specific troubleshooting
    if (error.message.includes('Invalid login')) {
      console.log('\n🔧 Gmail App Password Issues:');
      console.log('1. Make sure 2-Factor Authentication is enabled on your Gmail');
      console.log('2. Generate a new App Password: https://myaccount.google.com/apppasswords');
      console.log('3. Select "Mail" as the app and "Other" as the device');
      console.log('4. Copy the 16-character password (without spaces)');
      console.log('5. Update EMAIL_PASS in .env file');
      console.log('6. Restart the server');
    }
    return;
  }

  // Test 3: Send test email
  console.log('\n📤 Test 3: Sending test email...');
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'SevaLink Email Test',
      text: 'This is a test email from SevaLink server.',
      html: '<h1>SevaLink Email Test</h1><p>This is a test email from SevaLink server.</p>'
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.log('❌ Failed to send test email:', error.message);
    console.log('Full error:', error);
  }
}

debugEmail().then(() => {
  console.log('\n🏁 Email debugging completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug failed:', error);
  process.exit(1);
});
