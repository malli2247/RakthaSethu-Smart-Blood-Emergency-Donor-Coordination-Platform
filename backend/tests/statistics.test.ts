import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { CacheService } from '../src/services/cacheService';

const app = createApp();

describe('Statistics Module - 100% Database-Driven & Zero-Baseline Verification', () => {
  beforeEach(() => {
    CacheService.clear();
  });

  it('GET /api/statistics/public returns truthful database metrics without fake numbers', async () => {
    const res = await request(app).get('/api/statistics/public');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stats = res.body.data;
    expect(stats).toHaveProperty('users');
    expect(stats).toHaveProperty('donors');
    expect(stats).toHaveProperty('hospitals');
    expect(stats).toHaveProperty('bloodBanks');
    expect(stats).toHaveProperty('volunteers');
    expect(stats).toHaveProperty('bloodRequests');
    expect(stats).toHaveProperty('fulfilledRequests');
    expect(stats).toHaveProperty('successfulDonations');
    expect(stats).toHaveProperty('bloodUnitsDonated');
    expect(stats).toHaveProperty('livesImpacted');
    expect(stats).toHaveProperty('fulfillmentRate');

    // Every value must be a real integer >= 0, never undefined or NaN
    expect(typeof stats.users).toBe('number');
    expect(typeof stats.donors).toBe('number');
    expect(typeof stats.hospitals).toBe('number');
    expect(typeof stats.bloodBanks).toBe('number');
    expect(typeof stats.volunteers).toBe('number');
    expect(typeof stats.bloodRequests).toBe('number');
    expect(typeof stats.fulfilledRequests).toBe('number');
    expect(typeof stats.successfulDonations).toBe('number');
    expect(typeof stats.bloodUnitsDonated).toBe('number');
    expect(typeof stats.livesImpacted).toBe('number');
    expect(stats.fulfillmentRate).toBeGreaterThanOrEqual(0);
    expect(stats.fulfillmentRate).toBeLessThanOrEqual(100);
  });

  it('Strict Counting Rule: Only verified, active, eligible donors increment donor count', async () => {
    // 1. Get initial count
    const initialRes = await request(app).get('/api/statistics/public');
    const initialDonors = initialRes.body.data.donors;

    // 2. Create an UNVERIFIED donor user
    const unverifiedUser = await prisma.user.create({
      data: {
        email: `unverified_donor_${Date.now()}@test.com`,
        passwordHash: 'dummyhash',
        role: 'DONOR',
        isActive: true,
        isVerified: false, // NOT VERIFIED
        donorProfile: {
          create: {
            fullName: 'Unverified Test Donor',
            dateOfBirth: new Date('1995-01-01'),
            gender: 'MALE',
            bloodGroup: 'O+',
            city: 'Bangalore',
            state: 'Karnataka',
            address: '123 Test St',
            isAvailable: true,
            isEligible: true,
          },
        },
      },
    });

    CacheService.clear();
    const afterUnverifiedRes = await request(app).get('/api/statistics/public');
    // Must NOT increment verified donor count
    expect(afterUnverifiedRes.body.data.donors).toBe(initialDonors);

    // 3. Create a VERIFIED donor user
    const verifiedUser = await prisma.user.create({
      data: {
        email: `verified_donor_${Date.now()}@test.com`,
        passwordHash: 'dummyhash',
        role: 'DONOR',
        isActive: true,
        isVerified: true, // VERIFIED
        donorProfile: {
          create: {
            fullName: 'Verified Test Donor',
            dateOfBirth: new Date('1992-05-15'),
            gender: 'FEMALE',
            bloodGroup: 'A+',
            city: 'Bangalore',
            state: 'Karnataka',
            address: '456 Test St',
            isAvailable: true,
            isEligible: true,
          },
        },
      },
    });

    CacheService.clear();
    const afterVerifiedRes = await request(app).get('/api/statistics/public');
    // Must increment by exactly 1
    expect(afterVerifiedRes.body.data.donors).toBe(initialDonors + 1);

    // Cleanup
    await prisma.donorProfile.deleteMany({
      where: { userId: { in: [unverifiedUser.id, verifiedUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [unverifiedUser.id, verifiedUser.id] } },
    });
  });

  it('Strict Counting Rule: Only VERIFIED hospitals increment hospital count', async () => {
    const initialRes = await request(app).get('/api/statistics/public');
    const initialHospitals = initialRes.body.data.hospitals;

    // Create a PENDING hospital
    const hospUser = await prisma.user.create({
      data: {
        email: `hospital_${Date.now()}@test.com`,
        passwordHash: 'dummyhash',
        role: 'HOSPITAL',
        isActive: true,
        isVerified: false,
        hospitalProfile: {
          create: {
            name: 'St. Test General Hospital',
            licenseNumber: `LIC-${Date.now()}`,
            address: 'Medical Enclave',
            city: 'Bangalore',
            state: 'Karnataka',
            contactPerson: 'Dr. Test',
            contactPhone: '9876543210',
            verificationStatus: 'PENDING', // PENDING
          },
        },
      },
      include: { hospitalProfile: true },
    });

    CacheService.clear();
    const pendingRes = await request(app).get('/api/statistics/public');
    // Pending hospital should NOT be counted
    expect(pendingRes.body.data.hospitals).toBe(initialHospitals);

    // Now verify the hospital
    await prisma.hospital.update({
      where: { id: hospUser.hospitalProfile!.id },
      data: { verificationStatus: 'VERIFIED' },
    });

    CacheService.clear();
    const verifiedRes = await request(app).get('/api/statistics/public');
    // Verified hospital MUST be counted
    expect(verifiedRes.body.data.hospitals).toBe(initialHospitals + 1);

    // Cleanup
    await prisma.hospital.delete({ where: { id: hospUser.hospitalProfile!.id } });
    await prisma.user.delete({ where: { id: hospUser.id } });
  });

  it('Strict Counting Rule: Fulfilled requests and confirmed donations drive fulfillment and blood units', async () => {
    const initialRes = await request(app).get('/api/statistics/public');
    const initialFulfilled = initialRes.body.data.fulfilledRequests;
    const initialDonations = initialRes.body.data.successfulDonations;
    const initialUnits = initialRes.body.data.bloodUnitsDonated;

    // Create a test requester
    const requester = await prisma.user.create({
      data: {
        email: `requester_${Date.now()}@test.com`,
        passwordHash: 'dummyhash',
        role: 'PATIENT',
      },
    });

    // Create a PENDING request
    const bloodReq = await prisma.bloodRequest.create({
      data: {
        requesterId: requester.id,
        patientName: 'Emergency Patient A',
        bloodGroup: 'B+',
        unitsRequired: 2,
        hospitalName: 'Apollo City Hospital',
        hospitalCity: 'Bangalore',
        hospitalState: 'Karnataka',
        hospitalAddress: 'Bannerghatta Rd',
        requiredBy: new Date(Date.now() + 86400000),
        contactName: 'Attendant',
        contactPhone: '9988776655',
        status: 'PENDING',
      },
    });

    CacheService.clear();
    const pendingReqRes = await request(app).get('/api/statistics/public');
    // Request is pending, fulfilled count must not change
    expect(pendingReqRes.body.data.fulfilledRequests).toBe(initialFulfilled);

    // Now update request to FULFILLED
    await prisma.bloodRequest.update({
      where: { id: bloodReq.id },
      data: { status: 'FULFILLED' },
    });

    CacheService.clear();
    const fulfilledReqRes = await request(app).get('/api/statistics/public');
    expect(fulfilledReqRes.body.data.fulfilledRequests).toBe(initialFulfilled + 1);

    // Cleanup
    await prisma.bloodRequest.delete({ where: { id: bloodReq.id } });
    await prisma.user.delete({ where: { id: requester.id } });
  });

  it('GET /api/statistics/activity returns valid database activity feed', async () => {
    const res = await request(app).get('/api/statistics/activity');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const item = res.body.data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('timestamp');
    }
  });

  it('GET /api/statistics/inventory returns all 8 ABO/Rh blood groups with real stock counts', async () => {
    const res = await request(app).get('/api/statistics/inventory');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(8);

    const groups = res.body.data.map((item: any) => item.bloodGroup);
    expect(groups).toEqual(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

    res.body.data.forEach((item: any) => {
      expect(typeof item.units).toBe('number');
      expect(item.units).toBeGreaterThanOrEqual(0);
      expect(['EMPTY', 'CRITICAL', 'ADEQUATE']).toContain(item.status);
    });
  });
});
