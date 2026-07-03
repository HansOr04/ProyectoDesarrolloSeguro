/**
 * Jitsi Meet Integration Service
 * Soporta Jitsi local (http://) y público (https://)
 */
const { randomBytes } = require('node:crypto');

const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';

// URL base completa: si JITSI_BASE_URL está definida se usa tal cual,
// si no se construye con https para dominios externos y http para localhost
const _isLocal = JITSI_DOMAIN.startsWith('localhost') || JITSI_DOMAIN.startsWith('127.');
const JITSI_BASE_URL = process.env.JITSI_BASE_URL
    || (_isLocal ? `http://${JITSI_DOMAIN}` : `https://${JITSI_DOMAIN}`);

/**
 * Genera un nombre de sala único para una teleconsulta
 */
function generateRoomName(appointmentId) {
    const randomSuffix = randomBytes(6).toString('hex');
    return `triage-${appointmentId.substring(0, 8)}-${Date.now()}-${randomSuffix}`;
}

/**
 * Crea una sala de video para una cita
 */
async function createVideoRoom(appointmentId, patientName, doctorName) {
    const roomName = generateRoomName(appointmentId);
    const meetingUrl = `${JITSI_BASE_URL}/${roomName}`;

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
                'microphone', 'camera', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'chat', 'settings',
                'raisehand', 'videoquality', 'filmstrip', 'tileview'
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
            doctor:  { name: doctorName,  role: 'moderator' },
            patient: { name: patientName, role: 'participant' }
        }
    };

    return { meeting_url: meetingUrl, room_name: roomName, room_config: roomConfig };
}

/**
 * Configuración de embedding de Jitsi para el frontend
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
        userInfo: { displayName: userName, moderator: isModerator }
    };
}

/**
 * URL de acceso directo a la sala
 */
function getJoinUrl(roomName, displayName, isModerator = false) {
    const baseUrl = `${JITSI_BASE_URL}/${roomName}`;
    const config = [
        `userInfo.displayName="${encodeURIComponent(displayName)}"`,
        'config.prejoinPageEnabled=true',
        'config.disableDeepLinking=true'
    ];
    if (isModerator) config.push('config.startAsHost=true');
    return `${baseUrl}#${config.join('&')}`;
}

module.exports = {
    createVideoRoom,
    getEmbedConfig,
    getJoinUrl,
    generateRoomName,
    JITSI_DOMAIN,
    JITSI_BASE_URL
};
