# Forgot Password with OTP Verification

This document describes the implementation of the forgot password functionality with OTP verification in the LMS project.

## Features

- **Mobile Number Validation**: Validates Indian mobile number format (10 digits starting with 6-9)
- **OTP Generation**: Generates 6-digit OTP with 5-minute expiration
- **Multi-step Process**: 
  1. Mobile number input
  2. OTP verification
  3. New password setup
  4. Success confirmation
- **Timer Functionality**: 60-second countdown before allowing resend
- **Auto-focus**: OTP input fields auto-focus to next field
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on mobile and desktop

## Backend Implementation

### Models

#### OTP Model
```python
class OTP(models.Model):
    mobile_number = models.CharField(max_length=15)
    otp_code = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
```

#### User Model Updates
- Added `mobile` field to User model for mobile number storage

### API Endpoints

#### Send OTP
- **URL**: `/api/send-otp/`
- **Method**: POST
- **Body**: `{"mobile": "1234567890"}`
- **Response**: `{"message": "OTP sent successfully", "otp": "123456"}`

#### Verify OTP
- **URL**: `/api/verify-otp/`
- **Method**: POST
- **Body**: `{"mobile": "1234567890", "otp": "123456", "new_password": "NewPassword123"}`
- **Response**: `{"message": "OTP verified successfully", "token": "jwt_token", "refresh": "refresh_token"}`

## Frontend Implementation

### Components

#### ForgotPassword Component
- Located at: `src/pages/auth/ForgotPassword.js`
- Uses Material-UI components for consistent design
- Implements 4-step process with proper state management

### API Service

#### Auth Service Updates
```javascript
// OTP Forgot Password functions
sendOTP: async (mobileNumber) => {
    const response = await api.post('/send-otp/', { mobile: mobileNumber });
    return response.data;
},

verifyOTP: async (mobileNumber, otp, newPassword = null) => {
    const data = { mobile: mobileNumber, otp: otp };
    if (newPassword) {
        data.new_password = newPassword;
    }
    const response = await api.post('/verify-otp/', data);
    return response.data;
},
```

## Setup Instructions

### 1. Database Migration
Run the following commands to create and apply migrations:
```bash
cd lms_project
python manage.py makemigrations
python manage.py migrate
```

### 2. SMS Integration (Production)
For production use, integrate with an SMS service:

#### Option 1: Twilio
```python
from twilio.rest import Client

def send_sms(mobile_number, message):
    client = Client(account_sid, auth_token)
    message = client.messages.create(
        body=message,
        from_=twilio_number,
        to=f"+91{mobile_number}"
    )
```

#### Option 2: AWS SNS
```python
import boto3

def send_sms(mobile_number, message):
    sns = boto3.client('sns')
    response = sns.publish(
        PhoneNumber=f"+91{mobile_number}",
        Message=message
    )
```

### 3. Environment Variables
Add the following to your `.env` file:
```
# SMS Configuration
SMS_PROVIDER=twilio  # or aws_sns
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# AWS SNS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
```

## Usage

### For Users
1. Click "Forgot password?" on the login page
2. Enter your mobile number
3. Receive OTP via SMS
4. Enter the 6-digit OTP
5. Set a new password
6. Get redirected to dashboard

### For Developers
1. The OTP is returned in the API response for development
2. Remove the OTP from the response in production
3. Implement proper SMS service integration
4. Add rate limiting for OTP requests
5. Add logging for security monitoring

## Security Considerations

1. **OTP Expiration**: OTPs expire after 5 minutes
2. **Rate Limiting**: Implement rate limiting for OTP requests
3. **Mobile Validation**: Strict validation for Indian mobile numbers
4. **Password Requirements**: Enforce strong password requirements
5. **Logging**: Log all OTP attempts for security monitoring

## Testing

### Manual Testing
1. Test with valid mobile number
2. Test with invalid mobile number
3. Test OTP expiration
4. Test resend functionality
5. Test password validation
6. Test error scenarios

### API Testing
```bash
# Send OTP
curl -X POST http://learning-management-system-4i6f.onrender.com/api/send-otp/ \
    -H "Content-Type: application/json" \
    -d '{"mobile": "9876543210"}'

# Verify OTP
curl -X POST http://learning-management-system-4i6f.onrender.com/api/verify-otp/ \
    -H "Content-Type: application/json" \
    -d '{"mobile": "9876543210", "otp": "123456", "new_password": "NewPassword123"}'
```

## Troubleshooting

### Common Issues
1. **OTP not received**: Check SMS service configuration
2. **Invalid mobile number**: Ensure proper format (10 digits, starts with 6-9)
3. **OTP expired**: Wait for timer to complete and resend
4. **User not found**: Ensure mobile number is registered in the system

### Debug Mode
For development, OTP is returned in the API response. Check the response to get the OTP value.

## Future Enhancements

1. **Email OTP**: Add email-based OTP as alternative
2. **Voice OTP**: Add voice call OTP option
3. **Biometric**: Add fingerprint/face recognition
4. **Two-Factor**: Implement 2FA for additional security
5. **Account Recovery**: Add account recovery options 