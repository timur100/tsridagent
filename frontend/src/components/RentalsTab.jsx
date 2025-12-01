import React from 'react';
import { Unlock, Key, User } from 'lucide-react';

const RentalsTab = ({ theme, rentals, onReturn, getStatusLabel }) => {
  return (
    <div className="space-y-4">
      {rentals.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <User className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Keine aktiven Ausleihen
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <table className="w-full">
            <thead className={`${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
              <tr className="font-mono text-xs">
                <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Schlüssel
                </th>
                <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Typ
                </th>
                <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nutzer
                </th>
                <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Ausgeliehen
                </th>
                <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rückgabe bis
                </th>
                <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Verification
                </th>
                <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Zahlung
                </th>
                <th className={`px-4 py-3 text-right font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm divide-y divide-gray-700">
              {rentals.map((rental) => (
                <tr
                  key={rental.rental_id}
                  className={`${theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-50'} transition-colors`}
                >
                  <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-[#c00000]" />
                      {rental.key_number}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {rental.key_type === 'car' && '🚗 Auto'}
                    {rental.key_type === 'hotel' && '🏨 Hotel'}
                    {rental.key_type === 'office' && '🏢 Büro'}
                  </td>
                  <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div>
                      <div className="font-semibold">{rental.user_name}</div>
                      <div className="text-xs text-gray-500">{rental.user_email}</div>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date(rental.rented_at).toLocaleString('de-DE')}
                  </td>
                  <td className={`px-4 py-3 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date(rental.due_back).toLocaleString('de-DE')}
                  </td>
                  <td className="px-4 py-3">
                    {rental.verification_status === 'verified' ? (
                      <span className="text-green-500 text-xs">✓ Verifiziert</span>
                    ) : (
                      <span className="text-yellow-500 text-xs">Ausstehend</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {rental.payment_status === 'authorized' || rental.payment_status === 'captured' ? (
                      <span className="text-green-500 text-xs">✓ Bezahlt</span>
                    ) : (
                      <span className="text-yellow-500 text-xs">Ausstehend</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => onReturn(rental.rental_id)}
                        className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs"
                      >
                        <Unlock className="h-3 w-3" />
                        Zurückgeben
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RentalsTab;