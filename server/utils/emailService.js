const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS in .env file');
  }

  console.log('Creating email transporter with:', {
    user: process.env.EMAIL_USER,
    passLength: process.env.EMAIL_PASS?.length || 0
  });

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: true,
    logger: true
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, name = 'User') => {
  try {
    console.log(`📧 Attempting to send OTP email to: ${email}`);
    console.log(`🔢 OTP: ${otp}`);

    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'SevaLink Community',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Password Reset OTP - SevaLink',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 15px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .logo {
              background: rgba(255,255,255,0.2);
              width: 80px;
              height: 80px;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 36px;
              font-weight: bold;
              color: white;
            }
            h1 {
              color: white;
              margin-bottom: 10px;
              font-size: 28px;
            }
            .subtitle {
              color: rgba(255,255,255,0.9);
              margin-bottom: 30px;
              font-size: 16px;
            }
            .otp-container {
              background: white;
              border-radius: 10px;
              padding: 30px;
              margin: 30px 0;
              box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            .otp-label {
              color: #666;
              font-size: 14px;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #667eea;
              letter-spacing: 8px;
              margin: 10px 0;
              font-family: 'Courier New', monospace;
            }
            .warning {
              background: rgba(255,255,255,0.1);
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              color: rgba(255,255,255,0.9);
              font-size: 14px;
            }
            .footer {
              color: rgba(255,255,255,0.7);
              font-size: 12px;
              margin-top: 30px;
            }
            .security-tips {
              background: white;
              border-radius: 10px;
              padding: 20px;
              margin: 20px 0;
              text-align: left;
            }
            .security-tips h3 {
              color: #667eea;
              margin-bottom: 15px;
            }
            .security-tips ul {
              color: #666;
              padding-left: 20px;
            }
            .security-tips li {
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">S</div>
            <h1>Password Reset Request</h1>
            <p class="subtitle">Hello ${name}, we received a request to reset your password</p>
            
            <div class="otp-container">
              <div class="otp-label">Your Verification Code</div>
              <div class="otp-code">${otp}</div>
              <p style="color: #666; margin: 15px 0 0 0;">
                Enter this code on the password reset page to continue
              </p>
            </div>

            <div class="warning">
              ⚠️ This code will expire in 10 minutes for your security
            </div>

            <div class="security-tips">
              <h3>🔒 Security Tips</h3>
              <ul>
                <li>Never share this code with anyone</li>
                <li>SevaLink will never ask for your password via email</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Make sure you're on the official SevaLink website</li>
              </ul>
            </div>

            <div class="footer">
              <p>This is an automated message from SevaLink Community Portal</p>
              <p>If you have any questions, please contact our support team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        SevaLink - Password Reset OTP
        
        Hello ${name},
        
        We received a request to reset your password for your SevaLink account.
        
        Your verification code is: ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this password reset, please ignore this email.
        
        For security reasons, never share this code with anyone.
        
        Best regards,
        SevaLink Community Team
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully:', result.messageId);
    console.log('📧 Email response:', result.response);
    return { success: true, messageId: result.messageId, response: result.response };

  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    console.error('📧 Full error details:', error);

    // Provide specific error guidance
    let errorGuidance = 'Unknown email error';
    if (error.message.includes('Invalid login')) {
      errorGuidance = 'Gmail authentication failed. Check app password configuration.';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorGuidance = 'Cannot connect to Gmail SMTP server. Check internet connection.';
    } else if (error.message.includes('ETIMEDOUT')) {
      errorGuidance = 'Email sending timed out. Try again later.';
    }

    return {
      success: false,
      error: error.message,
      guidance: errorGuidance,
      code: error.code
    };
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'SevaLink Community',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Welcome to SevaLink Community! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to SevaLink</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 15px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .logo {
              background: rgba(255,255,255,0.2);
              width: 80px;
              height: 80px;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 36px;
              font-weight: bold;
              color: white;
            }
            h1 {
              color: white;
              margin-bottom: 10px;
              font-size: 28px;
            }
            .subtitle {
              color: rgba(255,255,255,0.9);
              margin-bottom: 30px;
              font-size: 16px;
            }
            .welcome-content {
              background: white;
              border-radius: 10px;
              padding: 30px;
              margin: 30px 0;
              text-align: left;
            }
            .feature {
              display: flex;
              align-items: center;
              margin-bottom: 15px;
              padding: 10px;
              background: #f8f9ff;
              border-radius: 8px;
            }
            .feature-icon {
              font-size: 24px;
              margin-right: 15px;
              width: 40px;
            }
            .cta-button {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 30px;
              border-radius: 25px;
              text-decoration: none;
              display: inline-block;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              color: rgba(255,255,255,0.7);
              font-size: 12px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">S</div>
            <h1>Welcome to SevaLink! 🎉</h1>
            <p class="subtitle">Hello ${name}, thank you for joining our community</p>
            
            <div class="welcome-content">
              <h3 style="color: #667eea; margin-bottom: 20px;">What you can do with SevaLink:</h3>
              
              <div class="feature">
                <div class="feature-icon">🆘</div>
                <div>
                  <strong>Submit Complaints</strong><br>
                  Report community issues and track their resolution
                </div>
              </div>
              
              <div class="feature">
                <div class="feature-icon">🩸</div>
                <div>
                  <strong>Blood Donation</strong><br>
                  Find donors or register as a blood donor
                </div>
              </div>
              
              <div class="feature">
                <div class="feature-icon">👴</div>
                <div>
                  <strong>Elderly Support</strong><br>
                  Connect with volunteers for elderly care services
                </div>
              </div>
              
              <div class="feature">
                <div class="feature-icon">🤝</div>
                <div>
                  <strong>Volunteer Network</strong><br>
                  Join as a volunteer and help your community
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:3001/dashboard" class="cta-button">
                  Get Started Now
                </a>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for being part of the SevaLink community!</p>
              <p>Together, we can make our community stronger 💪</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  testEmailConfig
};
