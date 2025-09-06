import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [sex, setSex] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Validate phone: optional but if provided must be 10 digits
      if (phone && !/^\d{10}$/.test(phone)) { setError('Phone number must be 10 digits'); return; }
  // Prepare payload (use backend field names)
  const payload = { UserName: username, Email: email, Password: password, Phone: phone, Sex: sex, DateOfBirth: dateOfBirth, FullName: fullName };
  const res = await api.post('/api/account/register', payload);
      if (res.status === 200) {
        navigate('/login');
      } else {
        setError('Registration failed');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data || err?.message;
      setError(typeof msg === 'string' ? msg : 'Registration failed');
    }
  };

  return (
    <div className="auth-form">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}><button type="button" onClick={() => navigate('/login')} style={{ background: 'transparent', border: 'none', fontSize: 18 }}>←</button> Register</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="text" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
        <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <input type="text" placeholder="Phone (10 digits)" value={phone} onChange={e => setPhone(e.target.value)} />
        <div>
          <label style={{ marginRight: 12 }}><input type="radio" name="sex" value="Male" checked={sex === 'Male'} onChange={e => setSex(e.target.value)} /> Male</label>
          <label><input type="radio" name="sex" value="Female" checked={sex === 'Female'} onChange={e => setSex(e.target.value)} style={{ marginLeft: 12 }} /> Female</label>
        </div>
        <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
        <button type="submit">Register</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default Register;
