import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

const DRAWER_WIDTH = 240;

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar drawerWidth={DRAWER_WIDTH} onMenuClick={handleDrawerToggle} />
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onClose={handleDrawerToggle}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          backgroundColor: 'background.default',
          overflow: 'auto',
          height: '100vh',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
