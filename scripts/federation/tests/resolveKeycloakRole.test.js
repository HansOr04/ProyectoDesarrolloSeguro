'use strict';

// Importa la función sin ejecutar main() — el módulo llama a main() al final,
// pero como está dentro de main().catch(...) no se ejecuta al require() en tests.
// Solo se exporta resolveKeycloakRole desde module.exports.
const { resolveKeycloakRole, TRIAGE_ROLE_MAP, MONETIX_ROLE_MAP } = require('../migrate-users');

describe('resolveKeycloakRole — mapa Triage (TRIAGE_ROLE_MAP)', () => {
    it('resuelve rol en minúsculas ("doctor" → "doctor")', () => {
        expect(resolveKeycloakRole('doctor', TRIAGE_ROLE_MAP, 'patient')).toBe('doctor');
    });

    it('resuelve rol en MAYÚSCULAS ("DOCTOR" → "doctor") — regresión bug casing', () => {
        expect(resolveKeycloakRole('DOCTOR', TRIAGE_ROLE_MAP, 'patient')).toBe('doctor');
    });

    it('resuelve rol mixto ("Admin" → "admin")', () => {
        expect(resolveKeycloakRole('Admin', TRIAGE_ROLE_MAP, 'patient')).toBe('admin');
    });

    it('rol inexistente cae al fallback "patient" con warning en stderr', () => {
        const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
        const result = resolveKeycloakRole('enfermero', TRIAGE_ROLE_MAP, 'patient');
        expect(result).toBe('patient');
        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('[migrate-users] WARN'));
        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('enfermero'));
        stderrSpy.mockRestore();
    });

    it('rol null cae al fallback con warning (no silencioso)', () => {
        const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
        const result = resolveKeycloakRole(null, TRIAGE_ROLE_MAP, 'patient');
        expect(result).toBe('patient');
        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('[migrate-users] WARN'));
        stderrSpy.mockRestore();
    });

    it('rol vacío ("") cae al fallback con warning', () => {
        const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
        const result = resolveKeycloakRole('', TRIAGE_ROLE_MAP, 'patient');
        expect(result).toBe('patient');
        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('[migrate-users] WARN'));
        stderrSpy.mockRestore();
    });
});

describe('resolveKeycloakRole — mapa Monetix (MONETIX_ROLE_MAP)', () => {
    it('resuelve "admin" → "monetix-admin"', () => {
        expect(resolveKeycloakRole('admin', MONETIX_ROLE_MAP, 'monetix-user')).toBe('monetix-admin');
    });

    it('resuelve "ADMIN" → "monetix-admin" (casing insensible)', () => {
        expect(resolveKeycloakRole('ADMIN', MONETIX_ROLE_MAP, 'monetix-user')).toBe('monetix-admin');
    });

    it('rol inexistente cae al fallback "monetix-user"', () => {
        const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
        const result = resolveKeycloakRole('superadmin', MONETIX_ROLE_MAP, 'monetix-user');
        expect(result).toBe('monetix-user');
        stderrSpy.mockRestore();
    });
});
