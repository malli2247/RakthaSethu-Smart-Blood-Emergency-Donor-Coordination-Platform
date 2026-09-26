import { PrismaClient } from '@prisma/client';
import { Role, BloodGroup, UrgencyLevel, ComponentType, InventoryStatus } from '../src/types/enums';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting RakthaSethu Database Seed...');

  const passwordHash = await bcrypt.hash('Demo@123456', 10);
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);

  // 1. Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rakthasethu.org' },
    update: {},
    create: {
      email: 'admin@rakthasethu.org',
      passwordHash: adminPasswordHash,
      phone: '+919999900001',
      role: Role.ADMIN,
      isVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Created Admin user: admin@rakthasethu.org (Password: Admin@123456)');

  // 2. Verified Hospital: Apollo Specialty Hospital
  const hospitalUser = await prisma.user.upsert({
    where: { email: 'apollo.hospital@rakthasethu.org' },
    update: {},
    create: {
      email: 'apollo.hospital@rakthasethu.org',
      passwordHash,
      phone: '+919999900002',
      role: Role.HOSPITAL,
      isVerified: true,
      isActive: true,
      hospitalProfile: {
        create: {
          name: 'Apollo Specialty Hospital',
          licenseNumber: 'HOSP-DEL-2024-001',
          address: 'Sarita Vihar, Delhi Mathura Road',
          city: 'New Delhi',
          state: 'Delhi',
          latitude: 28.5355,
          longitude: 77.2910,
          contactPerson: 'Dr. Rajesh Sharma (Blood Bank Officer)',
          contactPhone: '+919810012345',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
        },
      },
    },
    include: { hospitalProfile: true },
  });
  console.log('✅ Created Hospital: apollo.hospital@rakthasethu.org');

  // 3. Verified Blood Bank: Red Cross Central Blood Center
  const bloodBankUser = await prisma.user.upsert({
    where: { email: 'redcross.bloodbank@rakthasethu.org' },
    update: {},
    create: {
      email: 'redcross.bloodbank@rakthasethu.org',
      passwordHash,
      phone: '+919999900003',
      role: Role.BLOOD_BANK,
      isVerified: true,
      isActive: true,
      bloodBankProfile: {
        create: {
          name: 'Indian Red Cross Central Blood Bank',
          licenseNumber: 'BB-DEL-1092',
          address: '1 Red Cross Road, Sansad Marg',
          city: 'New Delhi',
          state: 'Delhi',
          latitude: 28.6219,
          longitude: 77.2104,
          contactPerson: 'Dr. Meenakshi Sundaram',
          contactPhone: '+919811154321',
          storageCapacity: 2500,
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
        },
      },
    },
    include: { bloodBankProfile: true },
  });
  console.log('✅ Created Blood Bank: redcross.bloodbank@rakthasethu.org');

  // Add Inventory to Red Cross Blood Bank
  if (bloodBankUser.bloodBankProfile) {
    const bbId = bloodBankUser.bloodBankProfile.id;
    const sampleInventory = [
      { bg: BloodGroup.O_NEGATIVE, comp: ComponentType.PACKED_RED_CELLS, units: 12, daysExp: 28 },
      { bg: BloodGroup.O_POSITIVE, comp: ComponentType.WHOLE_BLOOD, units: 35, daysExp: 32 },
      { bg: BloodGroup.A_POSITIVE, comp: ComponentType.WHOLE_BLOOD, units: 22, daysExp: 25 },
      { bg: BloodGroup.A_NEGATIVE, comp: ComponentType.PACKED_RED_CELLS, units: 4, daysExp: 14 }, // Low stock
      { bg: BloodGroup.B_POSITIVE, comp: ComponentType.WHOLE_BLOOD, units: 40, daysExp: 30 },
      { bg: BloodGroup.B_NEGATIVE, comp: ComponentType.PLATELETS, units: 6, daysExp: 3 }, // Expiring soon
      { bg: BloodGroup.AB_POSITIVE, comp: ComponentType.WHOLE_BLOOD, units: 18, daysExp: 20 },
      { bg: BloodGroup.AB_NEGATIVE, comp: ComponentType.FRESH_FROZEN_PLASMA, units: 3, daysExp: 180 }, // Low stock
    ];

    for (const inv of sampleInventory) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + inv.daysExp);
      await prisma.bloodInventory.create({
        data: {
          bloodBankId: bbId,
          bloodGroup: inv.bg,
          componentType: inv.comp,
          units: inv.units,
          batchNumber: `BATCH-RC-${inv.bg.substring(0, 2)}-${Math.floor(Math.random() * 9000 + 1000)}`,
          collectionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          expiryDate: expDate,
          status: InventoryStatus.AVAILABLE,
        },
      });
    }
    console.log('✅ Added realistic blood inventories across 8 blood groups');
  }

  // 4. Sample Donors for ALL 8 Blood Groups
  const donorsData = [
    {
      email: 'donor.oneg@rakthasethu.org',
      name: 'Rohan Verma (Universal Donor)',
      bg: BloodGroup.O_NEGATIVE,
      gender: 'MALE',
      city: 'New Delhi',
      state: 'Delhi',
      lat: 28.5300,
      lon: 77.2800,
      donations: 8,
      phone: '+919876543210',
    },
    {
      email: 'donor.opos@rakthasethu.org',
      name: 'Pooja Nair',
      bg: BloodGroup.O_POSITIVE,
      gender: 'FEMALE',
      city: 'New Delhi',
      state: 'Delhi',
      lat: 28.5400,
      lon: 77.2900,
      donations: 4,
      phone: '+919876543211',
    },
    {
      email: 'donor.apos@rakthasethu.org',
      name: 'Vikram Malhotra',
      bg: BloodGroup.A_POSITIVE,
      gender: 'MALE',
      city: 'Noida',
      state: 'Uttar Pradesh',
      lat: 28.5700,
      lon: 77.3200,
      donations: 5,
      phone: '+919876543212',
    },
    {
      email: 'donor.aneg@rakthasethu.org',
      name: 'Sneha Kulkarni',
      bg: BloodGroup.A_NEGATIVE,
      gender: 'FEMALE',
      city: 'New Delhi',
      state: 'Delhi',
      lat: 28.6100,
      lon: 77.2300,
      donations: 2,
      phone: '+919876543213',
    },
    {
      email: 'donor.bpos@rakthasethu.org',
      name: 'Amitabh Sen',
      bg: BloodGroup.B_POSITIVE,
      gender: 'MALE',
      city: 'Gurugram',
      state: 'Haryana',
      lat: 28.4595,
      lon: 77.0266,
      donations: 6,
      phone: '+919876543214',
    },
    {
      email: 'donor.bneg@rakthasethu.org',
      name: 'Farhan Akhtar',
      bg: BloodGroup.B_NEGATIVE,
      gender: 'MALE',
      city: 'New Delhi',
      state: 'Delhi',
      lat: 28.5800,
      lon: 77.2500,
      donations: 3,
      phone: '+919876543215',
    },
    {
      email: 'donor.abpos@rakthasethu.org',
      name: 'Divya Iyer (Universal Recipient)',
      bg: BloodGroup.AB_POSITIVE,
      gender: 'FEMALE',
      city: 'New Delhi',
      state: 'Delhi',
      lat: 28.6300,
      lon: 77.2200,
      donations: 1,
      phone: '+919876543216',
    },
    {
      email: 'donor.abneg@rakthasethu.org',
      name: 'Karan Mehra',
      bg: BloodGroup.AB_NEGATIVE,
      gender: 'MALE',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      lat: 28.6692,
      lon: 77.4538,
      donations: 3,
      phone: '+919876543217',
    },
  ];

  for (const d of donorsData) {
    await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        passwordHash,
        phone: d.phone,
        role: Role.DONOR,
        isVerified: true,
        isActive: true,
        donorProfile: {
          create: {
            fullName: d.name,
            dateOfBirth: new Date('1995-06-15'),
            gender: d.gender,
            bloodGroup: d.bg,
            city: d.city,
            state: d.state,
            address: `${d.city} Central Area, Sector 12`,
            latitude: d.lat,
            longitude: d.lon,
            lastDonationDate: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000), // >90 days ago = eligible
            isEligible: true,
            isAvailable: true,
            emergencyAvailable: true,
            totalDonations: d.donations,
            livesSavedEstimate: d.donations * 3,
            consentGiven: true,
            hidePhoneNumber: false,
            hideExactAddress: true,
          },
        },
      },
    });
  }
  console.log('✅ Created 8 active donor profiles covering all blood groups (Password: Demo@123456)');

  // 5. Patient & Attendant User
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@rakthasethu.org' },
    update: {},
    create: {
      email: 'patient@rakthasethu.org',
      passwordHash,
      phone: '+919999900010',
      role: Role.PATIENT,
      isVerified: true,
      isActive: true,
      patientProfile: {
        create: {
          fullName: 'Ananya Deshmukh',
          dateOfBirth: new Date('1990-03-22'),
          gender: 'FEMALE',
          bloodGroup: BloodGroup.B_POSITIVE,
          city: 'New Delhi',
          state: 'Delhi',
          emergencyContactName: 'Rahul Deshmukh (Husband)',
          emergencyContactPhone: '+919811998877',
        },
      },
    },
  });
  console.log('✅ Created Patient: patient@rakthasethu.org');

  // 6. Emergency Blood Request
  const emergencyRequest = await prisma.bloodRequest.create({
    data: {
      requesterId: patientUser.id,
      patientName: 'Ananya Deshmukh',
      patientAge: 34,
      patientGender: 'FEMALE',
      bloodGroup: BloodGroup.B_POSITIVE,
      unitsRequired: 2,
      hospitalName: 'Apollo Specialty Hospital',
      hospitalCity: 'New Delhi',
      hospitalState: 'Delhi',
      hospitalAddress: 'Sarita Vihar, Delhi Mathura Road',
      latitude: 28.5355,
      longitude: 77.2910,
      requiredBy: new Date(Date.now() + 12 * 60 * 60 * 1000), // In 12 hours
      urgency: UrgencyLevel.CRITICAL,
      medicalReason: 'Emergency surgery following severe internal hemorrhage after vehicular accident.',
      contactName: 'Rahul Deshmukh',
      contactPhone: '+919811998877',
      status: 'MATCHING',
      additionalNotes: 'Urgent red blood cells required. Cross-matching sample submitted at Blood Bank counter 3.',
    },
  });
  console.log('✅ Created Emergency Blood Request (B+ Critical)');

  // 7. Volunteer
  await prisma.user.upsert({
    where: { email: 'volunteer@rakthasethu.org' },
    update: {},
    create: {
      email: 'volunteer@rakthasethu.org',
      passwordHash,
      phone: '+919999900020',
      role: Role.VOLUNTEER,
      isVerified: true,
      isActive: true,
      volunteerProfile: {
        create: {
          fullName: 'Siddharth Rao',
          serviceAreaCity: 'New Delhi',
          serviceAreaState: 'Delhi',
          isAvailable: true,
          skills: 'Emergency Donor Dispatch, First Aid Certified, Transport Coordination',
          totalTasksCompleted: 14,
        },
      },
    },
  });
  console.log('✅ Created Volunteer: volunteer@rakthasethu.org');

  // 8. Public Blood Donation Campaign (Strictly isolated to DEMO environments, NEVER in production)
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_DATA === 'true') {
    const campaignStartDate = new Date();
    campaignStartDate.setDate(campaignStartDate.getDate() + 3);
    const campaignEndDate = new Date(campaignStartDate);
    campaignEndDate.setHours(campaignEndDate.getHours() + 8);

    await prisma.campaign.create({
      data: {
        organizerId: admin.id,
        title: '[DEMO DATA — NOT REAL] Delhi Lifesaver Donation Drive',
        description:
          'DEMO DATA — NOT REAL. Test fixture for local interface development only.',
        startDate: campaignStartDate,
        endDate: campaignEndDate,
        location: 'India Gate Lawns & Community Pavilion',
        address: 'Rajpath, India Gate',
        city: 'New Delhi',
        state: 'Delhi',
        latitude: 28.6129,
        longitude: 77.2295,
        bloodGroupsNeeded: 'ALL',
        targetUnits: 100,
        registeredCount: 0,
        status: 'UPCOMING',
      },
    });
    console.log('ℹ️ Seeded isolated demo campaign (DEMO DATA — NOT REAL)');
  }

  console.log('\n🎉 RakthaSethu Database Seed Complete!');
  console.log('----------------------------------------------------');
  console.log('🔑 Demo Login Credentials:');
  console.log('   Admin:      admin@rakthasethu.org       | Admin@123456');
  console.log('   Hospital:   apollo.hospital@rakthasethu.org | Demo@123456');
  console.log('   Blood Bank: redcross.bloodbank@rakthasethu.org | Demo@123456');
  console.log('   Donor (O-): donor.oneg@rakthasethu.org  | Demo@123456');
  console.log('   Donor (B+): donor.bpos@rakthasethu.org  | Demo@123456');
  console.log('   Patient:    patient@rakthasethu.org     | Demo@123456');
  console.log('   Volunteer:  volunteer@rakthasethu.org   | Demo@123456');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
