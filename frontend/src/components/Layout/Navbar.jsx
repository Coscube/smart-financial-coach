import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  Avatar,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useUserStore } from '@stores';

export function Navbar({ drawerWidth, onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useUserStore();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const handleSettings = () => {
    handleMenuClose();
    navigate('/settings');
  };

  const getInitials = () => {
    if (!user) return 'U';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <AccountBalanceWalletIcon sx={{ mr: 1 }} />
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Smart Financial Coach
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>
            {user?.first_name} {user?.last_name}
          </Typography>
          <IconButton onClick={handleMenuOpen} size="small">
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {getInitials()}
            </Avatar>
          </IconButton>
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          onClick={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            {user?.email}
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleSettings}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
