import React, { useState } from 'react';
import { Box, useTheme, useMediaQuery, CssBaseline } from '@mui/material';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';

interface LayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 280;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* AppBar */}
      <Navbar 
        drawerWidth={DRAWER_WIDTH} 
        onDrawerToggle={handleDrawerToggle} 
      />
      
      {/* Sidebar */}
      <Sidebar 
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onDrawerToggle={handleDrawerToggle}
      />
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          overflow: 'hidden'
        }}
      >
        {/* Toolbar spacer */}
        <Box sx={{ height: 64, mb: 2 }} />
        
        {/* Breadcrumbs */}
        <Breadcrumbs />
        
        {/* Page content */}
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 