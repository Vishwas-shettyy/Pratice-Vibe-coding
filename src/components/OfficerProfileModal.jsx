import React, { useState, useEffect, useRef } from 'react';

const defaultProfile = {
  fullName: '',
  officerId: '',
  designation: '',
  department: '',
  email: '',
  phone: '',
  location: '',
  district: '',
  state: '',
  latitude: '',
  longitude: '',
  profileImage: ''
};

export default function OfficerProfileModal({ isOpen, onClose, profile, setProfile }) {
  const [formData, setFormData] = useState({ ...defaultProfile });
  const [isEditing, setIsEditing] = useState(false);
  const [geoStatus, setGeoStatus] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (profile) {
        setFormData(profile);
        setIsEditing(false);
      } else {
        setFormData({ ...defaultProfile });
        setIsEditing(true);
      }
      setGeoStatus('');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Basic validation
    if (!formData.fullName) {
      alert("Full Name is required");
      return;
    }
    setProfile(formData);
    onClose();
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Location permission unavailable');
      return;
    }
    setGeoStatus('Requesting location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setGeoStatus('Location saved');
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setGeoStatus('Location permission unavailable');
      }
    );
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image is too large. Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'US';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 3000, padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, rgba(148, 163, 184, 0.3))',
        borderRadius: '16px', boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)',
        width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* HEADER */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color-subtle, rgba(148, 163, 184, 0.2))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Officer Profile</h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>ResQ Emergency Operations Officer</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* BODY */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Avatar Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--bg-secondary) 0%, #e2e8f0 100%)',
              border: '2px solid rgba(148, 163, 184, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center',
              overflow: 'hidden', flexShrink: 0, color: 'var(--text-primary)', fontSize: '28px', fontWeight: 700
            }}>
              {formData.profileImage ? (
                <img src={formData.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getInitials(formData.fullName)
              )}
            </div>
            {isEditing && (
              <div>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
                <button className="action-btn" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}>
                  Change Photo
                </button>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>JPG, PNG or GIF (Max 2MB)</div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} isEditing={isEditing} />
            <FormField label="Officer ID" name="officerId" value={formData.officerId} onChange={handleChange} isEditing={isEditing} placeholder="RESQ-OFC-001" />
            <FormField label="Designation / Role" name="designation" value={formData.designation} onChange={handleChange} isEditing={isEditing} placeholder="Emergency Response Officer" />
            <FormField label="Department / Organisation" name="department" value={formData.department} onChange={handleChange} isEditing={isEditing} placeholder="District Disaster Management Authority" />
            <FormField label="Email Address" name="email" value={formData.email} onChange={handleChange} isEditing={isEditing} type="email" placeholder="officer@example.com" />
            <FormField label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} isEditing={isEditing} type="tel" placeholder="+91 XXXXX XXXXX" />
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.02)', border: '1px solid var(--border-color-subtle, rgba(148, 163, 184, 0.2))', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Location Information</div>
              {isEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {geoStatus && <span style={{ fontSize: '11px', color: geoStatus === 'Location saved' ? 'var(--accent-safe, #10b981)' : 'var(--accent-warning, #f59e0b)' }}>{geoStatus}</span>}
                  <button className="action-btn" onClick={handleGetLocation} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>
                    Use Current Location
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormField label="Location / City" name="location" value={formData.location} onChange={handleChange} isEditing={isEditing} placeholder="Madikeri" />
              <FormField label="District" name="district" value={formData.district} onChange={handleChange} isEditing={isEditing} placeholder="Kodagu" />
              <FormField label="State" name="state" value={formData.state} onChange={handleChange} isEditing={isEditing} placeholder="Karnataka" />
              <div style={{ display: 'flex', gap: '8px' }}>
                <FormField label="Latitude" name="latitude" value={formData.latitude} onChange={handleChange} isEditing={isEditing} />
                <FormField label="Longitude" name="longitude" value={formData.longitude} onChange={handleChange} isEditing={isEditing} />
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color-subtle, rgba(148, 163, 184, 0.2))', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(15, 23, 42, 0.01)' }}>
          {isEditing ? (
            <>
              {profile && (
                <button className="action-btn" onClick={() => { setFormData(profile); setIsEditing(false); }} style={{ padding: '8px 16px', borderRadius: '8px' }}>
                  Cancel
                </button>
              )}
              {!profile && (
                <button className="action-btn" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px' }}>
                  Cancel
                </button>
              )}
              <button className="action-btn primary" onClick={handleSave} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-blue, #3b82f6)', color: '#fff', border: 'none' }}>
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button className="action-btn primary" onClick={() => setIsEditing(true)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-blue, #3b82f6)', color: '#fff', border: 'none' }}>
                Edit Profile
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

function FormField({ label, name, value, onChange, isEditing, type = 'text', placeholder = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
      {isEditing ? (
        <input 
          type={type} 
          name={name} 
          value={value} 
          onChange={onChange} 
          placeholder={placeholder}
          style={{
            padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color-subtle, rgba(148, 163, 184, 0.3))',
            background: '#ffffff', color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
            transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue, #3b82f6)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-color-subtle, rgba(148, 163, 184, 0.3))'}
        />
      ) : (
        <div style={{ fontSize: '14px', color: value ? 'var(--text-primary)' : 'var(--text-muted)', padding: '10px 0' }}>
          {value || 'Not specified'}
        </div>
      )}
    </div>
  );
}
