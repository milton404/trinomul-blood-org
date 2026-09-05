'use client';

import { useState } from 'react';
import { Droplets, ArrowRight, Info, AlertTriangle, Check } from 'lucide-react';

interface BloodGroup {
  group: string;
  canDonateTo: string[];
  canReceiveFrom: string[];
  antigen: string;
  rarity: 'common' | 'uncommon' | 'rare';
}

const bloodGroups: BloodGroup[] = [
  {
    group: 'O+',
    canDonateTo: ['O+', 'A+', 'B+', 'AB+'],
    canReceiveFrom: ['O+', 'O-'],
    antigen: 'RhD positive only',
    rarity: 'common',
  },
  {
    group: 'O-',
    canDonateTo: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
    canReceiveFrom: ['O-'],
    antigen: 'No RhD antigen (universal donor)',
    rarity: 'rare',
  },
  {
    group: 'A+',
    canDonateTo: ['A+', 'AB+'],
    canReceiveFrom: ['O+', 'O-', 'A+', 'A-'],
    antigen: 'A antigen + RhD positive',
    rarity: 'common',
  },
  {
    group: 'A-',
    canDonateTo: ['A+', 'A-', 'AB+', 'AB-'],
    canReceiveFrom: ['O-', 'A-'],
    antigen: 'A antigen only (RhD negative)',
    rarity: 'uncommon',
  },
  {
    group: 'B+',
    canDonateTo: ['B+', 'AB+'],
    canReceiveFrom: ['O+', 'O-', 'B+', 'B-'],
    antigen: 'B antigen + RhD positive',
    rarity: 'common',
  },
  {
    group: 'B-',
    canDonateTo: ['B+', 'B-', 'AB+', 'AB-'],
    canReceiveFrom: ['O-', 'B-'],
    antigen: 'B antigen only (RhD negative)',
    rarity: 'uncommon',
  },
  {
    group: 'AB+',
    canDonateTo: ['AB+'],
    canReceiveFrom: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
    antigen: 'Both A & B antigens + RhD (universal receiver)',
    rarity: 'uncommon',
  },
  {
    group: 'AB-',
    canDonateTo: ['AB+', 'AB-'],
    canReceiveFrom: ['O-', 'A-', 'B-', 'AB-'],
    antigen: 'Both A & B antigens (RhD negative)',
    rarity: 'rare',
  },
];

export default function BloodCompatibilityGuide() {
  const [selectedDonor, setSelectedDonor] = useState<string>('');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [showCompatibility, setShowCompatibility] = useState(false);

  const donorInfo = bloodGroups.find((bg) => bg.group === selectedDonor);
  const recipientInfo = bloodGroups.find((bg) => bg.group === selectedRecipient);

  const isCompatible = () => {
    if (!selectedDonor || !selectedRecipient) return null;
    return donorInfo?.canDonateTo.includes(selectedRecipient) || false;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-green-100 text-green-700 border-green-200';
      case 'uncommon': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rare': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-slate-100">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Droplets className="w-5 h-5 text-red-500" />
        Blood Group Compatibility Guide
      </h3>

      {/* Interactive Checker */}
      <div className="mb-8 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-100">
        <h4 className="font-semibold text-slate-900 mb-4">Quick Compatibility Check</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Donor Blood Type
            </label>
            <select
              value={selectedDonor}
              onChange={(e) => { setSelectedDonor(e.target.value); setShowCompatibility(true); }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 outline-none bg-white"
            >
              <option value="">Select donor type</option>
              {bloodGroups.map((bg) => (
                <option key={bg.group} value={bg.group}>{bg.group}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Recipient Blood Type
            </label>
            <select
              value={selectedRecipient}
              onChange={(e) => { setSelectedRecipient(e.target.value); setShowCompatibility(true); }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 outline-none bg-white"
            >
              <option value="">Select recipient type</option>
              {bloodGroups.map((bg) => (
                <option key={bg.group} value={bg.group}>{bg.group}</option>
              ))}
            </select>
          </div>
        </div>

        {showCompatibility && selectedDonor && selectedRecipient && (
          <div className={`p-4 rounded-xl flex items-center justify-center gap-3 ${
            isCompatible() === true 
              ? 'bg-green-100 border border-green-300' 
              : isCompatible() === false 
                ? 'bg-red-100 border border-red-300'
                : 'bg-slate-100 border border-slate-300'
          }`}>
            {isCompatible() === true ? (
              <>
                <Check className="w-6 h-6 text-green-600" />
                <span className="font-bold text-green-800">
                  ✅ Compatible! {selectedDonor} can donate to {selectedRecipient}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <span className="font-bold text-red-800">
                  ❌ Incompatible! {selectedDonor} cannot donate to {selectedRecipient}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Full Compatibility Chart */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 px-4 text-left font-semibold text-slate-700">Blood Type</th>
              <th className="py-3 px-4 text-center font-semibold text-slate-700">Can Donate To</th>
              <th className="py-3 px-4 text-center font-semibold text-slate-700">Can Receive From</th>
              <th className="py-3 px-4 text-left font-semibold text-slate-700">Notes</th>
            </tr>
          </thead>
          <tbody>
            {bloodGroups.map((bg) => (
              <tr key={bg.group} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg font-bold text-white ${
                      bg.group === 'O-' ? 'bg-gray-600' :
                      bg.group.includes('AB') ? 'bg-purple-500' :
                      bg.group.includes('A') ? 'bg-blue-500' :
                      bg.group.includes('B') ? 'bg-green-500' :
                      'bg-red-500'
                    }`}>
                      {bg.group}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getRarityColor(bg.rarity)}`}>
                      {bg.rarity}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex flex-wrap justify-center gap-1">
                    {bg.canDonateTo.map((type) => (
                      <span key={type} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
                        {type}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex flex-wrap justify-center gap-1">
                    {bg.canReceiveFrom.map((type) => (
                      <span key={type} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        {type}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-600 text-xs max-w-[200px]">{bg.antigen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key Information */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h5 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Universal Donor
          </h5>
          <p className="text-sm text-blue-700">
            <strong>O-</strong> blood type can donate to ANY blood type in emergencies.
            Only about 7% of the population has O- blood.
          </p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
          <h5 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Universal Recipient
          </h5>
          <p className="text-sm text-purple-700">
            <strong>AB+</strong> blood type can receive from ANY blood type.
            About 3% of the population has AB+ blood.
          </p>
        </div>
      </div>

      {/* Emergency Rule */}
      <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
        <h5 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Emergency Rule
        </h5>
        <p className="text-sm text-yellow-700">
          In life-threatening emergencies, <strong>O-</strong> (negative) blood can be given to anyone 
          as a temporary measure until properly matched blood is available. 
          This is why O- donors are called "Universal Donors".
        </p>
      </div>
    </div>
  );
}
