/**
 * Twilio SMS Service
 */

// Check if Twilio credentials are configured
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

if (accountSid && authToken && fromNumber) {
    try {
        const twilio = require('twilio');
        twilioClient = twilio(accountSid, authToken);
        console.log('[Twilio] Initialized successfully');
    } catch (error) {
        console.warn('[Twilio] Initialization failed:', error.message);
    }
} else {
    console.warn('[Twilio] Credentials not configured - SMS will be simulated');
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(to, message) {
    // Validate phone number format (Ecuador: +593)
    let phoneNumber = to;
    if (!phoneNumber.startsWith('+')) {
        // Assume Ecuador number
        if (phoneNumber.startsWith('0')) {
            phoneNumber = '+593' + phoneNumber.substring(1);
        } else {
            phoneNumber = '+593' + phoneNumber;
        }
    }

    if (twilioClient) {
        try {
            const result = await twilioClient.messages.create({
                body: message,
                from: fromNumber,
                to: phoneNumber
            });

            console.log(`[SMS] Sent to ${phoneNumber}: ${result.sid}`);
            return {
                success: true,
                sid: result.sid,
                status: result.status,
                to: phoneNumber
            };
        } catch (error) {
            console.error(`[SMS] Failed to send to ${phoneNumber}:`, error.message);
            return {
                success: false,
                error: error.message,
                to: phoneNumber
            };
        }
    } else {
        // Simulate SMS for development
        console.log(`[SMS SIMULATED] To: ${phoneNumber}`);
        console.log(`[SMS SIMULATED] Message: ${message}`);
        return {
            success: true,
            simulated: true,
            to: phoneNumber,
            message: 'SMS simulated (Twilio not configured)'
        };
    }
}

module.exports = {
    sendSMS
};
