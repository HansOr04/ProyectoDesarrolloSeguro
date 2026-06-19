/**
 * Jitsi Meet Integration Service
 * Creates and manages video conference rooms for teleconsultations
 */

const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';

/**
 * Generate a unique room name for a teleconsult
 */
function generateRoomName(appointmentId) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `triage-${appointmentId.substring(0, 8)}-${timestamp}-${randomSuffix}`;
}

/**
 * Create a video room for an appointment
 */
async function createVideoRoom(appointmentId, patientName, doctorName) {
    const roomName = generateRoomName(appointmentId);
    const meetingUrl = `https://${JITSI_DOMAIN}/${roomName}`;

    // Room configuration for Jitsi
    const roomConfig = {
        roomName,
        subject: `Teleconsulta: ${patientName}`,
        domain: JITSI_DOMAIN,
        meetingUrl,
        config: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            enableClosePage: false,
            prejoinPageEnabled: true,
            requireDisplayName: true,
            disableDeepLinking: true,
            defaultLanguage: 'es',
            enableLobbyChat: true,
            toolbarButtons: [
                'microphone',
                'camera',
                'desktop',
                'fullscreen',
                'fodeviceselection',
                'hangup',
                'chat',
                'settings',
                'raisehand',
                'videoquality',
                'filmstrip',
                'tileview'
            ]
        },
        interfaceConfig: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_ALWAYS_VISIBLE: true,
            DEFAULT_BACKGROUND: '#1a1a2e',
            DISABLE_VIDEO_BACKGROUND: false,
            MOBILE_APP_PROMO: false,
            ENABLE_FEEDBACK_ANIMATION: false
        },
        participants: {
            doctor: {
                name: doctorName,
                role: 'moderator'
            },
            patient: {
                name: patientName,
                role: 'participant'
            }
        }
    };

    return {
        meeting_url: meetingUrl,
        room_name: roomName,
        room_config: roomConfig
    };
}

/**
 * Generate Jitsi embed configuration for frontend
 */
function getEmbedConfig(roomName, userName, isModerator = false) {
    return {
        domain: JITSI_DOMAIN,
        roomName,
        configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: true
        },
        interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            TOOLBAR_ALWAYS_VISIBLE: true
        },
        userInfo: {
            displayName: userName,
            moderator: isModerator
        }
    };
}

/**
 * Generate join URL with parameters
 */
function getJoinUrl(roomName, displayName, isModerator = false) {
    const baseUrl = `https://${JITSI_DOMAIN}/${roomName}`;
    const config = [];

    config.push(`userInfo.displayName="${encodeURIComponent(displayName)}"`);
    config.push('config.prejoinPageEnabled=true');
    config.push('config.disableDeepLinking=true');

    if (isModerator) {
        config.push('config.startAsHost=true');
    }

    return `${baseUrl}#${config.join('&')}`;
}

module.exports = {
    createVideoRoom,
    getEmbedConfig,
    getJoinUrl,
    generateRoomName,
    JITSI_DOMAIN
};
