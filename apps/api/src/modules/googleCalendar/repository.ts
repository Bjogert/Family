import type { Pool } from 'pg';
import type { GoogleCalendarConnection, CalendarSettings } from '@family-hub/shared/types';

export function createGoogleCalendarRepository(pool: Pool) {
    return {
        async getConnectionByUserId(userId: number): Promise<GoogleCalendarConnection | null> {
            const result = await pool.query(
                `SELECT id, user_id, google_email, access_token, refresh_token, 
                token_expires_at, selected_calendar_ids, family_calendar_id,
                created_at, updated_at
         FROM google_calendar_connections 
         WHERE user_id = $1`,
                [userId]
            );
            if (result.rows.length === 0) return null;
            const row = result.rows[0];
            return {
                id: row.id,
                userId: row.user_id,
                googleEmail: row.google_email,
                accessToken: row.access_token,
                refreshToken: row.refresh_token,
                tokenExpiresAt: row.token_expires_at,
                selectedCalendarIds: row.selected_calendar_ids || [],
                familyCalendarId: row.family_calendar_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };
        },

        async upsertConnection(
            userId: number,
            googleEmail: string,
            accessToken: string,
            refreshToken: string,
            tokenExpiresAt: Date
        ): Promise<GoogleCalendarConnection> {
            const result = await pool.query(
                `INSERT INTO google_calendar_connections 
           (user_id, google_email, access_token, refresh_token, token_expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           google_email = EXCLUDED.google_email,
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           token_expires_at = EXCLUDED.token_expires_at,
           updated_at = NOW()
         RETURNING id, user_id, google_email, access_token, refresh_token, 
                   token_expires_at, selected_calendar_ids, family_calendar_id,
                   created_at, updated_at`,
                [userId, googleEmail, accessToken, refreshToken, tokenExpiresAt]
            );
            const row = result.rows[0];
            return {
                id: row.id,
                userId: row.user_id,
                googleEmail: row.google_email,
                accessToken: row.access_token,
                refreshToken: row.refresh_token,
                tokenExpiresAt: row.token_expires_at,
                selectedCalendarIds: row.selected_calendar_ids || [],
                familyCalendarId: row.family_calendar_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };
        },

        async updateTokens(
            userId: number,
            accessToken: string,
            tokenExpiresAt: Date
        ): Promise<void> {
            await pool.query(
                `UPDATE google_calendar_connections 
         SET access_token = $2, token_expires_at = $3, updated_at = NOW()
         WHERE user_id = $1`,
                [userId, accessToken, tokenExpiresAt]
            );
        },

        async updateSettings(
            userId: number,
            settings: CalendarSettings
        ): Promise<void> {
            await pool.query(
                `UPDATE google_calendar_connections 
         SET selected_calendar_ids = $2, family_calendar_id = $3, updated_at = NOW()
         WHERE user_id = $1`,
                [userId, JSON.stringify(settings.selectedCalendarIds), settings.familyCalendarId]
            );
        },

        async deleteConnection(userId: number): Promise<void> {
            await pool.query(
                `DELETE FROM google_calendar_connections WHERE user_id = $1`,
                [userId]
            );
        },
    };
}

export type GoogleCalendarRepository = ReturnType<typeof createGoogleCalendarRepository>;
