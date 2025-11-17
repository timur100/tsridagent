import React from 'react';
import { X, Ban } from 'lucide-react';

const BannedDocumentAlert = ({ banInfo, onClose, stationInfo }) => {
  if (!banInfo) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0 border-8 border-[#c00000] animate-pulse" />
      
      <div className="relative w-[90vw] max-w-5xl bg-[#121212] rounded-3xl shadow-2xl border-4 border-[#c00000] overflow-hidden">
        <div className="p-12">
        
        <div className="flex items-center justify-center gap-8 mb-12">
          <div className="bg-[#c00000] p-6 rounded-full animate-pulse">
            <Ban className="h-16 w-16 text-white" strokeWidth={3} />
          </div>
          
          <div className="text-center">
            <h1 className="text-5xl font-black text-[#c00000] uppercase tracking-wider mb-2 animate-pulse">
              DOKUMENT GESPERRT
            </h1>
            <p className="text-2xl text-white font-bold">
              Vermietung nicht zulässig
            </p>
          </div>
          
          <div className="bg-[#c00000] p-6 rounded-full animate-pulse">
            <Ban className="h-16 w-16 text-white" strokeWidth={3} />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-center gap-16 text-center">
            <div>
              <div className="text-sm text-gray-500 mb-2">Dokumentennummer</div>
              <div className="text-3xl font-mono font-bold text-white">
                {banInfo.ban_info.document_number}
              </div>
            </div>
            <div className="w-px h-16 bg-gray-800" />
            <div>
              <div className="text-sm text-gray-500 mb-2">Dokumententyp</div>
              <div className="text-3xl font-bold text-white">
                {banInfo.ban_info.document_type}
              </div>
            </div>
            <div className="w-px h-16 bg-gray-800" />
            <div>
              <div className="text-sm text-gray-500 mb-2">Land</div>
              <div className="text-3xl font-bold text-white">
                {banInfo.ban_info.issuing_country}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-xl text-gray-400">
            Dieses Dokument wurde zentral gesperrt und darf an <span className="text-[#c00000] font-bold">KEINER</span> Station verwendet werden.
          </p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-8 mb-8">
          <h3 className="text-xl font-bold text-white mb-6 text-center">
            Sofort durchzuführen:
          </h3>
          <div className="grid grid-cols-2 gap-6 text-lg">
            <div className="flex items-center gap-4">
              <div className="bg-[#c00000] text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">1</div>
              <span className="text-white font-semibold">Vermietung ablehnen</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[#c00000] text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">2</div>
              <span className="text-white font-semibold">Security-Team informieren</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[#2a2a2a] text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">3</div>
              <span className="text-gray-400">Keine Diskussion mit Kunde</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[#2a2a2a] text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">4</div>
              <span className="text-gray-400">Vorfall ist protokolliert</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm mb-8 px-4 py-3 bg-[#1a1a1a] rounded-xl">
          <div className="text-left">
            <div className="text-white font-semibold">
              Station: {stationInfo?.stationId || 'N/A'} - {stationInfo?.stationName || 'Unbekannt'}
            </div>
            <div className="text-gray-500 mt-1">
              {new Date(banInfo.ban_info.banned_at).toLocaleDateString('de-DE')} - {new Date(banInfo.ban_info.banned_at).toLocaleTimeString('de-DE')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#c00000] font-semibold">
              Gesperrt durch: {banInfo.ban_info.banned_by_user}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-5 bg-[#c00000] hover:bg-[#a00000] text-white font-bold text-2xl rounded-2xl transition-colors flex items-center justify-center gap-3 shadow-lg"
        >
          <X className="h-7 w-7" />
          Verstanden - Vermietung ablehnen
        </button>

      </div>
      </div>
    </div>
  );
};

export default BannedDocumentAlert;
