# OTP API Documentation

## Overview
This document describes the email-based OTP (One-Time Password) functionality for password reset in the LMS system.

## API Endpoints

### 1. Send OTP
**Endpoint:** `POST /api/send-otp/`

**Description:** Sends a 6-digit OTP to the user's email address for password reset.

**Request Body:**
```json
{
    "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
    "message": "OTP sent successfully to your email"
}
```

**Response (Error - 400):**
```json
{
    "error": "Email is required"
}
```

**Response (Error - 400):**
```json
{
    "error": "Please enter a valid email address"
}
```

**Response (Error - 400):**
```json
{
    "error": "No user found with this email address"
}
```

**Response (Error - 500):**
```json
{
    "error": "Failed to send email. Please try again."
}
```

### 2. Verify OTP
**Endpoint:** `POST /api/verify-otp/`

**Description:** Verifies the OTP and optionally resets the user's password.

**Request Body:**
```json
{
    "email": "user@example.com",
    "otp": "123456",
    "new_password": "NewPassword123"  // Optional
}
```

**Response (Success - 200):**
```json
{
    "message": "OTP verified successfully",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (Error - 400):**
```json
{
    "error": "Email and OTP are required"
}
```

**Response (Error - 400):**
```json
{
    "error": "No OTP found for this email"
}
```

**Response (Error - 400):**
```json
{
    "error": "OTP has expired"
}
```

**Response (Error - 400):**
```json
{
    "error": "Invalid OTP"
}
```

## Configuration

### Settings
The following settings are configured in `settings.py`:

```python
# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# OTP Settings
OTP_EXPIRY_MINUTES = 5  # OTP expires in 5 minutes
OTP_LENGTH = 6  # 6-digit OTP
```

### Database Model
```python
class OTP(models.Model):
    email = models.EmailField(max_length=255)
    otp_code = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    def is_expired(self):
        return timezone.now() > self.expires_at
```

## Usage Examples

### Frontend Call Examples

#### 🔹 OTP Generation (Send OTP)
```javascript
// Using fetch API
fetch('/api/send-otp/', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
        email: 'user@example.com' 
    })
})
.then(response => response.json())
.then(data => {
    if (data.message) {
        console.log('OTP sent successfully');
    } else {
        console.error('Error:', data.error);
    }
})
.catch(error => console.error('Error:', error));

// Using async/await
const sendOTP = async (email) => {
    try {
        const response = await fetch('/api/send-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw error;
    }
};
```

#### 🔹 OTP Verification
```javascript
// Using fetch API
fetch('/api/verify-otp/', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
        email: 'user@example.com', 
        otp: '123456' 
    })
})
.then(response => response.json())
.then(data => {
    if (data.token) {
        console.log('OTP verified successfully');
        // Store tokens
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refresh);
    } else {
        console.error('Error:', data.error);
    }
})
.catch(error => console.error('Error:', error));

// Using async/await
const verifyOTP = async (email, otp, newPassword = null) => {
    try {
        const requestBody = { 
            email, 
            otp
        };
        
        if (newPassword) {
            requestBody.new_password = newPassword;
        }
        
        const response = await fetch('/api/verify-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error verifying OTP:', error);
        throw error;
    }
};
```

#### 🔹 Complete Password Reset Flow
```javascript
// Complete password reset flow
const resetPassword = async (email, otp, newPassword) => {
    try {
        const response = await fetch('/api/verify-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email, 
                otp, 
                new_password: newPassword 
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
            // Store authentication tokens
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refresh);
            
            // Redirect to dashboard or login
            window.location.href = '/dashboard';
            return { success: true, message: 'Password reset successful' };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: 'Network error occurred' };
    }
};
```

#### 🔹 React Component Example
```jsx
import React, { useState } from 'react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: password
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOTP = async () => {
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch('/api/send-otp/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setStep(2);
            } else {
                setError(data.error);
            }
        } catch (error) {
            setError('Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch('/api/verify-otp/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setStep(3);
            } else {
                setError(data.error);
            }
        } catch (error) {
            setError('Failed to verify OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch('/api/verify-otp/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    otp, 
                    new_password: newPassword 
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('refreshToken', data.refresh);
                // Redirect to dashboard
                window.location.href = '/dashboard';
            } else {
                setError(data.error);
            }
        } catch (error) {
            setError('Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {step === 1 && (
                <div>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                    />
                    <button onClick={handleSendOTP} disabled={loading}>
                        {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                </div>
            )}
            
            {step === 2 && (
                <div>
                    <input 
                        type="text" 
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                    />
                    <button onClick={handleVerifyOTP} disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                </div>
            )}
            
            {step === 3 && (
                <div>
                    <input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                    />
                    <button onClick={handleResetPassword} disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </div>
            )}
            
            {error && <div style={{color: 'red'}}>{error}</div>}
        </div>
    );
};

export default ForgotPassword;
```

#### 🔹 Axios Example
```javascript
import axios from 'axios';

const API_BASE_URL = 'http://learning-management-system-4i6f.onrender.com/api';

// Send OTP
const sendOTP = async (email) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/send-otp/`, {
            email: email
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Verify OTP
const verifyOTP = async (email, otp, newPassword = null) => {
    try {
        const data = { email, otp };
        if (newPassword) {
            data.new_password = newPassword;
        }
        
        const response = await axios.post(`${API_BASE_URL}/verify-otp/`, data);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};
```

### Management Commands
```bash
# Test OTP functionality
python manage.py test_otp user@example.com --send

# Verify OTP
python manage.py test_otp user@example.com --verify 123456
```

## Security Features

1. **OTP Expiration:** OTPs expire after 5 minutes
2. **Smart OTP Usage:** 
   - Regular verification: OTP can only be used once
   - Password reset: OTP can be used twice within 5 minutes (for verification + password reset)
3. **Email Validation:** Only valid email addresses are accepted
4. **User Verification:** OTP is only sent to registered users
5. **CSRF Protection:** API endpoints are properly configured for cross-origin requests
6. **Rate Limiting:** Consider implementing rate limiting for production

## Recent Fixes

### ✅ OTP Password Reset Flow Fix
**Issue:** Users were getting "No OTP found for this email" error when trying to reset password after OTP verification.

**Root Cause:** The frontend flow uses OTP twice:
1. First verification (without password) - marks OTP as used
2. Password reset (with password) - fails because OTP already used

**Solution:** Modified OTP verification logic to handle password reset scenarios:
- Added `for_password_reset` parameter to `verify_otp()` function
- When `for_password_reset=True`: Allows using recently created OTPs (within 5 minutes)
- When `for_password_reset=False`: Uses original logic (only unverified OTPs)

**Result:** Complete password reset flow now works seamlessly without errors.

## Error Handling

The API provides comprehensive error handling for:
- Invalid email formats
- Non-existent users
- Expired OTPs
- Invalid OTP codes
- Email delivery failures
- Database errors

## Testing

Use the provided management command to test OTP functionality:
```bash
python manage.py test_otp user@example.com --send
python manage.py test_otp user@example.com --verify 123456
```

## Troubleshooting

### Common Issues and Solutions

#### 🔴 "No OTP found for this email"
**Cause:** OTP has already been used or expired
**Solution:** Request a new OTP using the send OTP endpoint

#### 🔴 "OTP has expired"
**Cause:** OTP is older than 5 minutes
**Solution:** Request a new OTP

#### 🔴 "Invalid OTP"
**Cause:** Wrong OTP code entered
**Solution:** Check the OTP in your email and re-enter

#### 🔴 "No user found with this email address"
**Cause:** Email is not registered in the system
**Solution:** Use a registered email address

#### 🔴 CSRF Verification Failed (403 Forbidden)
**Cause:** Cross-origin request blocked
**Solution:** ✅ **Fixed** - CSRF exemptions are now properly configured

#### 🔴 "Failed to send email"
**Cause:** Email service configuration issue
**Solution:** Check email settings in `settings.py`

### Debug Steps
1. Check server logs for detailed error messages
2. Verify email configuration in Django settings
3. Ensure user exists in database
4. Check OTP expiration time
5. Verify frontend is sending correct data format

## Production Considerations

1. **Email Service:** Use a reliable email service (SendGrid, AWS SES, etc.)
2. **Rate Limiting:** Implement rate limiting to prevent abuse
3. **Logging:** Add comprehensive logging for debugging
4. **Monitoring:** Monitor OTP success/failure rates
5. **Security:** Consider additional security measures like IP blocking 