import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { WebPushService } from '../src/services/webPushService';

const app = createApp();

function generateAuthToken(userId: string, role = 'DONOR', email = 'push_test@rakthasethu.org'): string {
  return jwt.sign(
    {
      id: userId,
      email,
      role,
      isVerified: true,
    },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );
}

describe('Web Push Notification System & Service Worker Endpoints', () => {
  let testUser: any;
  let testAuthToken: string;

  beforeEach(async () => {
    // Create an authenticated test user
    const randomSuffix = Math.floor(Math.random() * 1000000);
    testUser = await prisma.user.create({
      data: {
        email: `push_user_${randomSuffix}@rakthasethu.org`,
        passwordHash: 'dummy_hash',
        role: 'DONOR',
        phone: `+9198765${String(randomSuffix).padStart(5, '0').slice(0, 5)}`,
        isActive: true,
        isVerified: true,
      },
    });

    testAuthToken = generateAuthToken(testUser.id, testUser.role, testUser.email);
  });

  it('GET /api/notifications/vapid-public-key returns the active VAPID public key', async () => {
    const res = await request(app).get('/api/notifications/vapid-public-key');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('publicKey');
    expect(typeof res.body.data.publicKey).toBe('string');
    expect(res.body.data.publicKey.length).toBeGreaterThan(20);
  });

  it('POST /api/notifications/push-subscription saves push credentials and device metadata', async () => {
    const subscriptionPayload = {
      endpoint: `https://fcm.googleapis.com/fcm/send/test-token-${Date.now()}`,
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcFY31T2-5V1285UrptFi',
        auth: 'tBHItJI5svbpLNkp0_UQ4w',
      },
      deviceType: 'MOBILE',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36',
    };

    const res = await request(app)
      .post('/api/notifications/push-subscription')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(subscriptionPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify stored in database
    const savedSub = await prisma.pushSubscription.findFirst({
      where: { userId: testUser.id, endpoint: subscriptionPayload.endpoint },
    });
    expect(savedSub).toBeDefined();
    expect(savedSub?.p256dh).toBe(subscriptionPayload.keys.p256dh);
    expect(savedSub?.auth).toBe(subscriptionPayload.keys.auth);
    expect(savedSub?.deviceType).toBe('MOBILE');
    expect(savedSub?.isActive).toBe(true);
  });

  it('DELETE /api/notifications/push-subscription deactivates user push registration', async () => {
    const endpoint = `https://fcm.googleapis.com/fcm/send/delete-test-${Date.now()}`;
    await prisma.pushSubscription.create({
      data: {
        userId: testUser.id,
        endpoint,
        p256dh: 'dummy-p256dh',
        auth: 'dummy-auth',
        isActive: true,
      },
    });

    const res = await request(app)
      .delete('/api/notifications/push-subscription')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ endpoint });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify marked inactive
    const updatedSub = await prisma.pushSubscription.findFirst({
      where: { endpoint },
    });
    expect(updatedSub?.isActive).toBe(false);
  });

  it('GET & PATCH /api/notifications/preferences manages emergency notification channels', async () => {
    // 1. Fetch default preferences
    const getRes = await request(app)
      .get('/api/notifications/preferences')
      .set('Authorization', `Bearer ${testAuthToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data).toHaveProperty('emergencyAlerts');
    expect(getRes.body.data.emergencyAlerts).toBe(true);

    // 2. Update preferences
    const patchRes = await request(app)
      .patch('/api/notifications/preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        soundEnabled: false,
        vibrationEnabled: true,
        campaignAlerts: false,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.data.soundEnabled).toBe(false);
    expect(patchRes.body.data.campaignAlerts).toBe(false);
  });

  it('WebPushService sanitizes sensitive personal identifiers from lock screen payloads', () => {
    const rawData = {
      bloodGroup: 'O_POSITIVE',
      unitsNeeded: 2,
      patientPhone: '+919988776655',
      patientName: 'Confidential Patient',
      latitude: 12.9716,
      longitude: 77.5946,
      hospitalName: 'Apollo Hospital',
      city: 'Bangalore',
    };

    const sanitized = WebPushService.sanitizePayloadData(rawData);

    // Sensitive phone and patient names must NOT be present
    expect(sanitized).not.toHaveProperty('patientPhone');
    expect(sanitized).not.toHaveProperty('patientName');
    expect(sanitized).not.toHaveProperty('latitude');
    expect(sanitized).not.toHaveProperty('longitude');

    // Safe emergency metadata must remain
    expect(sanitized.bloodGroup).toBe('O_POSITIVE');
    expect(sanitized.unitsNeeded).toBe(2);
    expect(sanitized.hospitalName).toBe('Apollo Hospital');
    expect(sanitized.city).toBe('Bangalore');
  });

  it('WebPushService configures distinct vibration patterns by urgency priority', () => {
    const criticalVibe = WebPushService.getVibrationPattern('CRITICAL');
    const normalVibe = WebPushService.getVibrationPattern('NORMAL');

    expect(Array.isArray(criticalVibe)).toBe(true);
    expect(Array.isArray(normalVibe)).toBe(true);
    // Critical priority has a longer or repeating emergency vibration pattern
    expect(criticalVibe.length).toBeGreaterThan(normalVibe.length);
  });
});
