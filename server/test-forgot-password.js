const axios = require('axios');

async function testForgotPassword() {
  console.log('🧪 Testing forgot password API...');
  
  const testEmail = 'praveen_ramisetti354@gmail.com'; // Using an existing user
  
  try {
    console.log(`📧 Testing with email: ${testEmail}`);
    
    const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
      email: testEmail
    });
    
    console.log('✅ API Response:', response.data);
    
    if (response.data.otp) {
      console.log(`🔢 OTP for testing: ${response.data.otp}`);
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('📝 User not found - this is expected if email doesn\'t exist');
    } else if (error.response?.status === 500) {
      console.log('🔧 Server error - check email configuration');
    }
  }
}

testForgotPassword().then(() => {
  console.log('\n🏁 Forgot password test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
