import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Droplets,
  Heart,
  Building2,
  Users,
  AlertCircle,
  Lock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Role, BloodGroup } from '../../types';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as Role) || 'DONOR';

  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Donor form state
  const [donorName, setDonorName] = useState('');
  const [donorDob, setDonorDob] = useState('1998-05-20');
  const [donorGender, setDonorGender] = useState('MALE');
  const [donorBloodGroup, setDonorBloodGroup] = useState<BloodGroup>('O_POSITIVE');
  const [donorCity, setDonorCity] = useState('');
  const [donorState, setDonorState] = useState('');
  const [donorAddress, setDonorAddress] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [emergencyAvailable, setEmergencyAvailable] = useState(true);
  const [hidePhoneNumber, setHidePhoneNumber] = useState(false);
  const [hideExactAddress, setHideExactAddress] = useState(true);

  // Patient form state
  const [patientName, setPatientName] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [patientCity, setPatientCity] = useState('');
  const [patientState, setPatientState] = useState('');

  // Hospital & Blood Bank form state
  const [orgName, setOrgName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgCity, setOrgCity] = useState('');
  const [orgState, setOrgState] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Volunteer form state
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerCity, setVolunteerCity] = useState('');
  const [volunteerState, setVolunteerState] = useState('');
  const [volunteerSkills, setVolunteerSkills] = useState('First Aid, Transport, Coordination');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        email,
        password,
        phone,
        role,
      };

      if (role === 'DONOR') {
        payload.donorData = {
          fullName: donorName,
          dateOfBirth: donorDob,
          gender: donorGender,
          bloodGroup: donorBloodGroup,
          city: donorCity,
          state: donorState,
          address: donorAddress,
          isAvailable,
          emergencyAvailable,
          hidePhoneNumber,
          hideExactAddress,
          consentGiven: true,
        };
      } else if (role === 'PATIENT' || role === 'ATTENDANT') {
        payload.patientData = {
          fullName: patientName,
          city: patientCity,
          state: patientState,
          emergencyContactName,
          emergencyContactPhone,
        };
      } else if (role === 'HOSPITAL') {
        payload.hospitalData = {
          name: orgName,
          licenseNumber,
          address: orgAddress,
          city: orgCity,
          state: orgState,
          contactPerson,
          contactPhone,
        };
      } else if (role === 'BLOOD_BANK') {
        payload.bloodBankData = {
          name: orgName,
          licenseNumber,
          address: orgAddress,
          city: orgCity,
          state: orgState,
          contactPerson,
          contactPhone,
          storageCapacity: 1500,
        };
      } else if (role === 'VOLUNTEER') {
        payload.volunteerData = {
          fullName: volunteerName,
          serviceAreaCity: volunteerCity,
          serviceAreaState: volunteerState,
          skills: volunteerSkills,
        };
      }

      await register(payload);

      // Redirect to appropriate dashboard
      if (role === 'DONOR') navigate('/donor/dashboard');
      else if (role === 'HOSPITAL') navigate('/hospital/dashboard');
      else if (role === 'BLOOD_BANK') navigate('/bloodbank/dashboard');
      else if (role === 'VOLUNTEER') navigate('/volunteer/dashboard');
      else navigate('/patient/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-200">
              <Droplets className="w-6 h-6 fill-white text-white" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              Raktha<span className="text-rose-600">Sethu</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Create Your Account</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Join thousands of voluntary donors and humanitarian healthcare providers.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 text-center">
            Select Your Role
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { r: 'DONOR', label: 'Donor', icon: Heart },
              { r: 'PATIENT', label: 'Patient / Family', icon: Users },
              { r: 'HOSPITAL', label: 'Hospital', icon: Building2 },
              { r: 'BLOOD_BANK', label: 'Blood Bank', icon: Droplets },
              { r: 'VOLUNTEER', label: 'Volunteer', icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = role === item.r;
              return (
                <button
                  key={item.r}
                  type="button"
                  onClick={() => setRole(item.r as Role)}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Base credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password *
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Primary Phone *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Role specific form fields */}
          {role === 'DONOR' && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-600 fill-rose-500" />
                Donor Health & Profile Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Verma"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Blood Group *</label>
                  <select
                    value={donorBloodGroup}
                    onChange={(e) => setDonorBloodGroup(e.target.value as BloodGroup)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white font-bold text-rose-700"
                  >
                    <option value="O_NEGATIVE">O- (Universal Donor)</option>
                    <option value="O_POSITIVE">O+</option>
                    <option value="A_POSITIVE">A+</option>
                    <option value="A_NEGATIVE">A-</option>
                    <option value="B_POSITIVE">B+</option>
                    <option value="B_NEGATIVE">B-</option>
                    <option value="AB_POSITIVE">AB+ (Universal Recipient)</option>
                    <option value="AB_NEGATIVE">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={donorDob}
                    onChange={(e) => setDonorDob(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New Delhi"
                    value={donorCity}
                    onChange={(e) => setDonorCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delhi"
                    value={donorState}
                    onChange={(e) => setDonorState(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Area / Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sector / Locality"
                    value={donorAddress}
                    onChange={(e) => setDonorAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    I am currently available to donate
                  </span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyAvailable}
                    onChange={(e) => setEmergencyAvailable(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Available for Emergency Critical calls
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Privacy Protected: Your exact address and phone number remain masked until you
                  accept a request.
                </span>
              </div>
            </div>
          )}

          {/* Hospital / Blood Bank Details */}
          {['HOSPITAL', 'BLOOD_BANK'].includes(role) && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Organization & Licensing Credentials
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Facility Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apollo Specialty Hospital"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Medical / Blood Bank License Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. REG-2024-HOSP-099"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Street / Hospital campus"
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New Delhi"
                    value={orgCity}
                    onChange={(e) => setOrgCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delhi"
                    value={orgState}
                    onChange={(e) => setOrgState(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Contact Person Name & Designation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Rajesh Sharma (Blood Bank Officer)"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Emergency Blood Bank Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98100 12345"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Patient / Family Details */}
          {['PATIENT', 'ATTENDANT'].includes(role) && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                Patient & Attendant Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya Deshmukh"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New Delhi"
                    value={patientCity}
                    onChange={(e) => setPatientCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delhi"
                    value={patientState}
                    onChange={(e) => setPatientState(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Emergency Attendant Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Deshmukh"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Emergency Attendant Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98119 98877"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Volunteer Details */}
          {role === 'VOLUNTEER' && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Volunteer Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Siddharth Rao"
                    value={volunteerName}
                    onChange={(e) => setVolunteerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Service City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New Delhi"
                    value={volunteerCity}
                    onChange={(e) => setVolunteerCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Service State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delhi"
                    value={volunteerState}
                    onChange={(e) => setVolunteerState(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-md shadow-rose-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Creating account...' : 'Complete Registration'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-rose-600 hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};
