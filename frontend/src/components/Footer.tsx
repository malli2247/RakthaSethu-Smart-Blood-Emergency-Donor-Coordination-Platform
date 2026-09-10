import React from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Heart, PhoneCall, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white">
                <Droplets className="w-5 h-5 fill-white text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Raktha<span className="text-rose-500">Sethu</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every drop is a lifeline. RakthaSethu connects voluntary blood donors, patients in
              critical need, certified hospitals, and blood banks in real-time.
            </p>
            <div className="flex items-center gap-2 text-xs text-rose-400 font-semibold">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              100% Voluntary & Humanitarian
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Platform Links
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/find-blood" className="hover:text-rose-400 transition-colors">
                  Find Blood Donors
                </Link>
              </li>
              <li>
                <Link to="/compatibility" className="hover:text-rose-400 transition-colors">
                  Blood Compatibility Guide
                </Link>
              </li>
              <li>
                <Link to="/campaigns" className="hover:text-rose-400 transition-colors">
                  Blood Donation Drives
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-rose-400 transition-colors">
                  How RakthaSethu Works
                </Link>
              </li>
              <li>
                <Link to="/patient/create-request" className="text-rose-400 hover:underline">
                  Emergency Blood Request
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Role Portals */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Portal Access
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/register?role=DONOR" className="hover:text-rose-400 transition-colors">
                  Join as Blood Donor
                </Link>
              </li>
              <li>
                <Link to="/register?role=HOSPITAL" className="hover:text-rose-400 transition-colors">
                  Register Hospital
                </Link>
              </li>
              <li>
                <Link to="/register?role=BLOOD_BANK" className="hover:text-rose-400 transition-colors">
                  Register Blood Bank
                </Link>
              </li>
              <li>
                <Link to="/register?role=VOLUNTEER" className="hover:text-rose-400 transition-colors">
                  Become a Volunteer
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-rose-400 transition-colors">
                  Staff & Admin Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Emergency Assistance */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Emergency Guidance
            </h4>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <PhoneCall className="w-4 h-4" />
                Emergency Hotline
              </div>
              <p className="text-xs text-slate-400">
                In acute trauma or life-threatening hemorrhage, call local emergency services
                immediately or inform the nearest blood bank.
              </p>
              <div className="text-lg font-black text-white">112 / 108 / 104</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} RakthaSethu Foundation. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Privacy Protected & Masked Contact Data
            </span>
            <Link to="/faq" className="hover:text-slate-400">
              Disclaimer
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
