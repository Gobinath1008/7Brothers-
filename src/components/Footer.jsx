import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Trophy, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-lime-500 flex items-center justify-center text-slate-950 font-black">
                <Flame className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-heading font-black text-lg text-white">
                7BROTHERS <span className="text-lime-400">CRICKET</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm">
              Official Box Cricket Tournament Management System. Automated knockout brackets, instant guest team registration, real-time ball-by-ball scorekeeping, and verified printable match reports.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-bold text-white uppercase text-xs tracking-wider mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-lime-400 transition-colors">Home Page</Link>
              </li>
              <li>
                <Link to="/tournaments" className="hover:text-lime-400 transition-colors">Tournaments</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-lime-400 transition-colors">Register Your Team</Link>
              </li>
              <li>
                <Link to="/live" className="hover:text-lime-400 transition-colors">Live Scoreboard</Link>
              </li>
              <li>
                <Link to="/bracket" className="hover:text-lime-400 transition-colors">Knockout Bracket</Link>
              </li>
            </ul>
          </div>

          {/* Admin & Support */}
          <div>
            <h4 className="font-heading font-bold text-white uppercase text-xs tracking-wider mb-3">Management</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/admin/login" className="flex items-center gap-1.5 text-slate-300 hover:text-lime-400 transition-colors">
                  <ShieldCheck className="w-4 h-4 text-lime-400" />
                  Admin Portal
                </Link>
              </li>
              <li className="text-xs text-slate-500 pt-2">
                Asia/Kolkata Standard Timezone
              </li>
              <li className="text-xs text-slate-500">
                Single-Vercel Architecture with MongoDB Atlas
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} 7Brothers Box Cricket League. All rights reserved.
          </div>
          <div className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 mx-0.5" /> for Box Cricket Champions
          </div>
        </div>
      </div>
    </footer>
  );
}
