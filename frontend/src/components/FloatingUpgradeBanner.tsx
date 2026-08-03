import React from 'react';
import { Crown } from 'lucide-react';

export const FloatingUpgradeBanner: React.FC = () => {
  return (
    <div className="floating-upgrade-banner">
      <div className="banner-text">
        <Crown className="w-4 h-4 text-indigo-600" />
        <span>Upgrade to Pro for more detailed answers powered by top AI models.</span>
      </div>
      <button className="btn-banner-upgrade">
        Upgrade Now
      </button>
    </div>
  );
};
