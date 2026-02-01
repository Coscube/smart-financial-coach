import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Avatar,
  Grid,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

export function Settings() {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    currency: 'USD',
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage your account preferences
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Profile
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Button variant="outlined" size="small">
                  Change Photo
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Full Name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Currency"
                  value={profile.currency}
                  onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                  fullWidth
                />
                <Button variant="contained" sx={{ alignSelf: 'flex-start' }}>
                  Save Changes
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Danger Zone */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
            <CardContent>
              <Typography variant="h6" color="error" gutterBottom>
                Danger Zone
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body1">Delete Account</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Permanently delete your account and all associated data
                  </Typography>
                </Box>
                <Button variant="outlined" color="error">
                  Delete Account
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
