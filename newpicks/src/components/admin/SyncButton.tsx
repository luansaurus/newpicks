'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface SyncButtonProps {
  onSync: () => Promise<void>;
  className?: string;
}

export function SyncButton({ onSync, className = '' }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onSync();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 ${className}`}
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Sincronizando...' : 'Sincronizar API'}
    </button>
  );
}