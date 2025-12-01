import React from 'react';
import { Clock } from 'lucide-react';

const HistoryTab = ({ theme }) => {
  return (
    <div className={`p-12 text-center rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
      <Clock className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
      <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        Verlauf-Ansicht
      </p>
      <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
        Hier werden alle vergangenen Ausleihvorgänge angezeigt
      </p>
    </div>
  );
};

export default HistoryTab;