'use strict';

const { generateRoomName, getJoinUrl, getEmbedConfig, createVideoRoom, JITSI_DOMAIN } = require('../../src/services/jitsi.service');

describe('Jitsi Service — generateRoomName', () => {
    it('genera un nombre con el prefijo correcto', () => {
        const roomName = generateRoomName('appointment-123');
        expect(roomName).toMatch(/^triage-/);
    });

    it('incluye los primeros 8 caracteres del appointmentId', () => {
        const roomName = generateRoomName('appointment-abc123');
        expect(roomName).toContain('appointm');
    });

    it('el sufijo aleatorio tiene 12 caracteres hex (6 bytes = crypto fuerte)', () => {
        const roomName = generateRoomName('test-id-xyz');
        // formato: triage-{8chars}-{timestamp}-{12hexchars}
        const parts = roomName.split('-');
        const suffix = parts.at(-1);
        expect(suffix).toHaveLength(12);
        expect(suffix).toMatch(/^[0-9a-f]+$/);
    });

    it('no genera colisión en 1000 llamadas consecutivas', () => {
        const names = new Set();
        for (let i = 0; i < 1000; i++) {
            names.add(generateRoomName('fixed-id-1234'));
        }
        expect(names.size).toBe(1000);
    });

    it('genera nombres distintos para el mismo appointmentId en llamadas seguidas', () => {
        const room1 = generateRoomName('same-id');
        const room2 = generateRoomName('same-id');
        expect(room1).not.toBe(room2);
    });
});

describe('Jitsi Service — getJoinUrl', () => {
    it('genera URL válida con el dominio Jitsi', () => {
        const url = getJoinUrl('test-room', 'John Doe', false);
        expect(url).toContain(JITSI_DOMAIN);
        expect(url).toContain('test-room');
        expect(url).toContain('displayName');
    });

    it('incluye flag de moderador para doctores', () => {
        const url = getJoinUrl('test-room', 'Dr. Smith', true);
        expect(url).toContain('startAsHost=true');
    });
});

describe('Jitsi Service — getEmbedConfig', () => {
    it('devuelve configuración de embedding válida', () => {
        const config = getEmbedConfig('room-123', 'Juan', false);
        expect(config.domain).toBe(JITSI_DOMAIN);
        expect(config.roomName).toBe('room-123');
        expect(config.userInfo.displayName).toBe('Juan');
    });

    it('asigna el flag moderator correctamente', () => {
        const config = getEmbedConfig('room-123', 'Doctor', true);
        expect(config.userInfo.moderator).toBe(true);
    });
});

describe('Jitsi Service — createVideoRoom', () => {
    it('crea sala con estructura correcta', async () => {
        const result = await createVideoRoom('appt-123', 'Patient Name', 'Doctor Name');
        expect(result.meeting_url).toBeDefined();
        expect(result.room_name).toBeDefined();
        expect(result.room_config).toBeDefined();
        expect(result.room_config.participants).toHaveProperty('doctor');
        expect(result.room_config.participants).toHaveProperty('patient');
    });
});
