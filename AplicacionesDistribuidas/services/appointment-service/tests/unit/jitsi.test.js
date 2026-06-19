const { generateRoomName, getJoinUrl, getEmbedConfig, createVideoRoom, JITSI_DOMAIN } = require('../src/services/jitsi.service');

describe('Jitsi Service', () => {
    describe('generateRoomName', () => {
        it('should generate a unique room name', () => {
            const roomName = generateRoomName('appointment-123');
            expect(roomName).toBeDefined();
            expect(roomName).toContain('triage-');
            expect(roomName).toContain('appointm'); // First 8 chars
        });

        it('should generate different names for same input at different times', () => {
            const room1 = generateRoomName('test');
            const room2 = generateRoomName('test');
            // Due to timestamp + random, these should be different
            expect(room1).not.toBe(room2);
        });
    });

    describe('getJoinUrl', () => {
        it('should generate a valid Jitsi join URL', () => {
            const url = getJoinUrl('test-room', 'John Doe', false);
            expect(url).toContain(JITSI_DOMAIN);
            expect(url).toContain('test-room');
            expect(url).toContain('displayName');
        });

        it('should include moderator flag for doctors', () => {
            const url = getJoinUrl('test-room', 'Dr. Smith', true);
            expect(url).toContain('startAsHost=true');
        });
    });

    describe('getEmbedConfig', () => {
        it('should return valid embed configuration', () => {
            const config = getEmbedConfig('room-123', 'Juan', false);
            expect(config.domain).toBe(JITSI_DOMAIN);
            expect(config.roomName).toBe('room-123');
            expect(config.userInfo.displayName).toBe('Juan');
        });

        it('should set moderator flag correctly', () => {
            const config = getEmbedConfig('room-123', 'Doctor', true);
            expect(config.userInfo.moderator).toBe(true);
        });
    });

    describe('createVideoRoom', () => {
        it('should create a video room with correct structure', async () => {
            const result = await createVideoRoom('appt-123', 'Patient Name', 'Doctor Name');

            expect(result.meeting_url).toBeDefined();
            expect(result.meeting_url).toContain('https://');
            expect(result.room_name).toBeDefined();
            expect(result.room_config).toBeDefined();
            expect(result.room_config.participants).toHaveProperty('doctor');
            expect(result.room_config.participants).toHaveProperty('patient');
        });
    });
});
