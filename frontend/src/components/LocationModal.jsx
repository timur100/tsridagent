import React from 'react';
import { X } from 'lucide-react';

const LocationModal = ({
  theme,
  show,
  onClose,
  editing,
  formData,
  onChange,
  onSubmit
}) => {
  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const inputClass = `w-full px-3 py-2 rounded-lg text-sm ${
    theme === 'dark'
      ? 'bg-[#1f1f1f] text-white border border-gray-600'
      : 'bg-white text-gray-900 border border-gray-300'
  }`;

  const labelClass = `block text-sm font-medium mb-1 ${
    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  }`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl ${
        theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
      }`}>
        <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-200 bg-white'
        }`}>
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editing ? 'Standort bearbeiten' : 'Neuer Standort'}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${
              theme === 'dark' ? 'hover:bg-[#333]' : 'hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basis-Informationen */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Basis-Informationen
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Location Code *</label>
                <input
                  type="text"
                  name="location_code"
                  value={formData.location_code}
                  onChange={handleChange}
                  required
                  placeholder="z.B. BERN03"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Stationsname *</label>
                <input
                  type="text"
                  name="station_name"
                  value={formData.station_name}
                  onChange={handleChange}
                  required
                  placeholder="z.B. BERNAU BEI BERLIN"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Typ</label>
                <select
                  name="main_type"
                  value={formData.main_type}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="A">A - Standard</option>
                  <option value="C">C - City</option>
                  <option value="CAP">CAP - Airport</option>
                  <option value="CSS">CSS - Van/Truck</option>
                  <option value="CRR">CRR - Railway</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>ID Checker</label>
                <input
                  type="number"
                  name="id_checker"
                  value={formData.id_checker}
                  onChange={handleChange}
                  placeholder="1, 2, etc."
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Adresse
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Straße *</label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  required
                  placeholder="z.B. SCHWANEBECKER CHAUSSEE 12"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>PLZ *</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  required
                  placeholder="z.B. 16321"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Stadt *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  placeholder="z.B. BERNAU BEI BERLIN"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Bundesland *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  placeholder="z.B. BB, BE, HH"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Land</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleChange}
                  placeholder="z.B. Deutschland"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Kontinent</label>
                <input
                  type="text"
                  name="continent"
                  value={formData.continent || ''}
                  onChange={handleChange}
                  placeholder="z.B. Europa"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Kontakt */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kontakt
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Manager</label>
                <input
                  type="text"
                  name="manager"
                  value={formData.manager}
                  onChange={handleChange}
                  placeholder="z.B. Fibich & Scholz GbR"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>E-Mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="z.B. dest@europcar.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Telefon</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="z.B. +49 (3338) 704099"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Telefon Intern</label>
                <input
                  type="text"
                  name="phone_internal"
                  value={formData.phone_internal}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Technische Informationen */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Technische Informationen
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Switch</label>
                <input
                  type="text"
                  name="switch_info"
                  value={formData.switch_info}
                  onChange={handleChange}
                  placeholder="z.B. Switch voll"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Port</label>
                <input
                  type="text"
                  name="port"
                  value={formData.port}
                  onChange={handleChange}
                  placeholder="z.B. 7 +12"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>SN-PC</label>
                <input
                  type="text"
                  name="sn_pc"
                  value={formData.sn_pc}
                  onChange={handleChange}
                  placeholder="z.B. 47714571453"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>SN-SC</label>
                <input
                  type="text"
                  name="sn_sc"
                  value={formData.sn_sc}
                  onChange={handleChange}
                  placeholder="z.B. 201728 00606"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>TV-ID</label>
                <input
                  type="text"
                  name="tv_id"
                  value={formData.tv_id}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Kommentare */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kommentare
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelClass}>IT Kommentar</label>
                <textarea
                  name="it_comment"
                  value={formData.it_comment}
                  onChange={handleChange}
                  rows={2}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>TSR Remarks</label>
                <textarea
                  name="tsr_remarks"
                  value={formData.tsr_remarks}
                  onChange={handleChange}
                  rows={2}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* GPS Koordinaten */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              GPS-Koordinaten (optional)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Latitude</label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="z.B. 52.520008"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Longitude</label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="z.B. 13.404954"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-[#1f1f1f] hover:bg-[#333] text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all text-sm font-medium"
            >
              {editing ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationModal;
