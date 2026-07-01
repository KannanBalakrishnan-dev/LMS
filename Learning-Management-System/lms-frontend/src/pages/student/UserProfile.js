import React, { useState } from 'react';
import {
  Typography, TextField, Button, DialogActions, DialogContent
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const UserProfile = ({ user, onClose }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    team: user?.team?.name || '',
  });

  const [saving, setSaving] = useState(false);
  const { setUser } = useAuth(); // get setUser from context

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      alert('Username cannot be empty.');
      return;
    }
    try {
      setSaving(true);
      // Always get the JWT token from localStorage using the key 'token'
      const token = localStorage.getItem('token');

      await axios.put(`/api/users/${user.id}/`, {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        user_type: user.user_type
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Fetch the updated user data and update context
      const updatedUser = await axios.get(`/api/users/me/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser(updatedUser.data);

      alert('Profile updated successfully!');
      onClose();
    } catch (error) {
      if (error.response && error.response.data) {
        const err = error.response.data;
        let msg = 'Failed to save profile';
        if (typeof err === 'string') msg = err;
        else if (typeof err === 'object') {
          msg = Object.values(err).flat().join(' ');
        }
        alert(msg);
      } else {
        alert('Failed to save profile');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogContent>
        <Typography variant="h6" gutterBottom>Edit Profile</Typography>

        <TextField
          fullWidth margin="dense" label="Username" name="username"
          value={formData.username} onChange={handleChange}
        />
        <TextField
          fullWidth margin="dense" label="Email" name="email"
          value={formData.email} onChange={handleChange}
          disabled // 🔒 Email uneditable
        />
        <TextField
          fullWidth margin="dense" label="First Name" name="first_name"
          value={formData.first_name} onChange={handleChange}
        />
        <TextField
          fullWidth margin="dense" label="Last Name" name="last_name"
          value={formData.last_name} onChange={handleChange}
        />
        <TextField
          fullWidth margin="dense" label="Team" name="team"
          value={formData.team} disabled // 🔒 Team uneditable
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </>
  );
};

export default UserProfile;
