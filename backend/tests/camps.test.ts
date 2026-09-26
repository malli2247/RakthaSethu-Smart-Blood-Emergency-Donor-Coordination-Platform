import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { ERaktKoshSyncService } from '../src/services/eRaktKoshSyncService';
import { CampService } from '../src/services/campService';

const app = createApp();

function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: true,
    },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );
}

describe('Real-Time Blood Donation Camps & Zero Fake Data Verification', () => {
  let adminUser: any;
  let hospitalUser: any;
  let donorUser: any;
  let adminToken: string;
  let hospitalToken: string;
  let donorToken: string;

  beforeEach(async () => {
    // Clean camps from test database before each test
    await prisma.campRegistration.deleteMany({});
    await prisma.bloodDonationCamp.deleteMany({});
    await prisma.campSyncLog.deleteMany({});

    const suffix = Math.floor(Math.random() * 1000000);

    adminUser = await prisma.user.create({
      data: {
        email: `camp_admin_${suffix}@rakthasethu.org`,
        passwordHash: 'dummy',
        role: 'ADMIN',
        isActive: true,
        isVerified: true,
      },
    });

    hospitalUser = await prisma.user.create({
      data: {
        email: `camp_hospital_${suffix}@rakthasethu.org`,
        passwordHash: 'dummy',
        role: 'HOSPITAL',
        isActive: true,
        isVerified: true,
      },
    });

    donorUser = await prisma.user.create({
      data: {
        email: `camp_donor_${suffix}@rakthasethu.org`,
        passwordHash: 'dummy',
        role: 'DONOR',
        isActive: true,
        isVerified: true,
        donorProfile: {
          create: {
            fullName: 'Camp Test Donor',
            dateOfBirth: new Date('1995-05-10'),
            gender: 'MALE',
            bloodGroup: 'O+',
            city: 'Bangalore',
            state: 'Karnataka',
            address: 'Indiranagar, Bangalore',
          },
        },
      },
    });

    adminToken = generateToken(adminUser);
    hospitalToken = generateToken(hospitalUser);
    donorToken = generateToken(donorUser);
  });

  it('ZERO FAKE DATA: GET /api/camps returns empty array and zero metadata when no real camps exist', async () => {
    const res = await request(app).get('/api/camps');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.meta.total).toBe(0);
  });

  it('LOCATION DISCOVERY: Filters camps within radius and calculates Haversine distance', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    // Create a verified camp in Bangalore Central (12.9716, 77.5946)
    await prisma.bloodDonationCamp.create({
      data: {
        source: 'E_RAKTKOSH',
        sourceCampId: 'ERAKTKOSH-BLR-001',
        campName: 'Bangalore Central Blood Donation Drive',
        venue: 'Town Hall, JC Road',
        address: 'JC Road, Sampangi Rama Nagara, Bengaluru',
        city: 'Bangalore',
        state: 'Karnataka',
        latitude: 12.9634,
        longitude: 77.5855,
        coordinateConfidence: 'EXACT',
        organizerName: 'Red Cross Karnataka',
        campDate: futureDate,
        startTime: '09:00',
        endTime: '15:00',
        status: 'UPCOMING',
        verificationStatus: 'VERIFIED',
      },
    });

    // Query from nearby location (~2 km away)
    const nearbyRes = await request(app)
      .get('/api/camps')
      .query({ lat: 12.9716, lon: 77.5946, radius: 10 });

    expect(nearbyRes.status).toBe(200);
    expect(nearbyRes.body.data.length).toBe(1);
    expect(nearbyRes.body.data[0].campName).toBe('Bangalore Central Blood Donation Drive');
    expect(nearbyRes.body.data[0].distanceKm).toBeDefined();
    expect(nearbyRes.body.data[0].distanceKm).toBeLessThan(5);
  });

  it('RADIUS EXPANSION: Transparently expands radius and informs user when no camps in initial radius', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    // Create a camp in Dehradun (30.3165, 78.0322)
    await prisma.bloodDonationCamp.create({
      data: {
        source: 'OFFICIAL_GOV',
        sourceCampId: 'UK-DDN-001',
        campName: 'Dehradun Community Health Camp',
        venue: 'Parade Ground Community Center',
        address: 'Parade Ground, Dehradun',
        city: 'Dehradun',
        state: 'Uttarakhand',
        latitude: 30.3255,
        longitude: 78.0410,
        coordinateConfidence: 'EXACT',
        organizerName: 'Uttarakhand Blood Transfusion Council',
        campDate: futureDate,
        startTime: '10:00',
        endTime: '16:00',
        status: 'UPCOMING',
        verificationStatus: 'VERIFIED',
      },
    });

    // User is located ~40 km away (Rishikesh: 30.0869, 78.2676)
    // 1. Initial 25 km query with expand=true
    const expandedRes = await request(app)
      .get('/api/camps')
      .query({ lat: 30.0869, lon: 78.2676, radius: 25, expand: 'true' });

    expect(expandedRes.status).toBe(200);
    expect(expandedRes.body.data.length).toBe(1);
    expect(expandedRes.body.meta.expanded).toBe(true);
    expect(expandedRes.body.meta.radiusKm).toBe(50);
    expect(expandedRes.body.meta.expansionMessage).toContain('within 50 km');

    // 2. Query with expand=false: must return empty array without silent expansion
    const strictRes = await request(app)
      .get('/api/camps')
      .query({ lat: 30.0869, lon: 78.2676, radius: 25, expand: 'false' });

    expect(strictRes.status).toBe(200);
    expect(strictRes.body.data.length).toBe(0);
    expect(strictRes.body.meta.expanded).toBe(false);
  });

  it('VERIFICATION WORKFLOW: Hospital camps require Admin verification before public display', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    // 1. Hospital submits a camp
    const createRes = await request(app)
      .post('/api/camps')
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({
        campName: 'Apollo Lifesaver Camp',
        venue: 'Hospital Atrium',
        address: 'Bannerghatta Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        campDate: futureDate.toISOString(),
        startTime: '09:00',
        endTime: '17:00',
        organizerName: 'Apollo Hospitals Blood Bank',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.verificationStatus).toBe('PENDING');
    const campId = createRes.body.data.id;

    // 2. Public query must NOT show the pending camp
    const publicBeforeRes = await request(app).get('/api/camps');
    expect(publicBeforeRes.body.data.length).toBe(0);

    // 3. Admin verifies the camp
    const verifyRes = await request(app)
      .patch(`/api/camps/admin/${campId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Verified hospital license and facility accreditation.' });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verificationStatus).toBe('VERIFIED');
    expect(verifyRes.body.data.verifiedBy).toBe(adminUser.id);
    expect(verifyRes.body.data.verificationSource).toBe('ADMIN_VERIFIED');

    // 4. Public query NOW displays the verified camp
    const publicAfterRes = await request(app).get('/api/camps');
    expect(publicAfterRes.body.data.length).toBe(1);
    expect(publicAfterRes.body.data[0].id).toBe(campId);
  });

  it('BATCH IMPORT & DEDUPLICATION: Ingests verified records and prevents duplicates', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 4);

    const campBatch = [
      {
        sourceCampId: 'ERAKTKOSH-DL-9901',
        campName: 'Delhi Red Cross Voluntary Camp',
        venue: 'Red Cross Bhawan, Golf Links',
        address: '1 Red Cross Road, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        campDate: futureDate.toISOString(),
        startTime: '09:30',
        endTime: '16:30',
        organizerName: 'Indian Red Cross Society',
        contactPhone: '+911123716441',
      },
    ];

    // First import
    const import1 = await request(app)
      .post('/api/camps/admin/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ camps: campBatch });

    expect(import1.status).toBe(200);
    expect(import1.body.data.inserted).toBe(1);

    // Second import of the identical camp: must update, NOT duplicate
    const import2 = await request(app)
      .post('/api/camps/admin/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ camps: campBatch });

    expect(import2.status).toBe(200);
    expect(import2.body.data.inserted).toBe(0);
    expect(import2.body.data.updated).toBe(1);

    const totalCampsInDb = await prisma.bloodDonationCamp.count();
    expect(totalCampsInDb).toBe(1);
  });

  it('STATUS & EXPIRY: Expired past camps are automatically excluded from upcoming discovery', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    await prisma.bloodDonationCamp.create({
      data: {
        source: 'E_RAKTKOSH',
        sourceCampId: 'ERAKTKOSH-PAST-01',
        campName: 'Completed Past Blood Drive',
        venue: 'Old Community Hall',
        address: 'MG Road, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        campDate: pastDate,
        startTime: '09:00',
        endTime: '15:00',
        status: 'UPCOMING', // Stored as upcoming initially
        verificationStatus: 'VERIFIED',
        organizerName: 'City Hospital',
      },
    });

    // Public list query evaluates expiry
    const res = await request(app).get('/api/camps');
    expect(res.status).toBe(200);
    // Past camp must be excluded from active/upcoming discovery
    expect(res.body.data.length).toBe(0);

    // Verify database record was updated to COMPLETED
    const campInDb = await prisma.bloodDonationCamp.findFirst({
      where: { sourceCampId: 'ERAKTKOSH-PAST-01' },
    });
    expect(campInDb?.status).toBe('COMPLETED');
  });

  it('DONOR REGISTRATION: Registered donor can register and cancel for a verified camp', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const camp = await prisma.bloodDonationCamp.create({
      data: {
        source: 'RAKTHASETHU',
        campName: 'Community Blood Drive',
        venue: 'Indiranagar Club',
        address: '100ft Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        campDate: futureDate,
        startTime: '10:00',
        endTime: '16:00',
        status: 'UPCOMING',
        verificationStatus: 'VERIFIED',
        organizerName: 'Rotary Bangalore',
      },
    });

    // 1. Donor registers
    const regRes = await request(app)
      .post(`/api/camps/${camp.id}/register`)
      .set('Authorization', `Bearer ${donorToken}`);

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    // 2. Fetch camp to verify registeredCount and isRegistered flag
    const getRes = await request(app)
      .get(`/api/camps/${camp.id}`)
      .set('Authorization', `Bearer ${donorToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.registrationCount).toBe(1);
    expect(getRes.body.data.isRegistered).toBe(true);

    // 3. Donor cancels registration
    const cancelRes = await request(app)
      .delete(`/api/camps/${camp.id}/register`)
      .set('Authorization', `Bearer ${donorToken}`);

    expect(cancelRes.status).toBe(200);

    // 4. Verify count decreases
    const afterCancelRes = await request(app).get(`/api/camps/${camp.id}`);
    expect(afterCancelRes.body.data.registrationCount).toBe(0);
  });
});
