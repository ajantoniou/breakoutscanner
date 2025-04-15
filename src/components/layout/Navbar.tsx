import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton, 
  Menu, 
  MenuItem, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import HistoryIcon from '@mui/icons-material/History';
import TimelineIcon from '@mui/icons-material/Timeline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navItems = [
    { name: 'Golden Scanner', path: '/golden-scanner', icon: <TrendingUpIcon /> },
    { name: 'Day/Swing Scanner', path: '/scanner', icon: <BarChartIcon /> },
    { name: 'Backtest', path: '/backtest', icon: <HistoryIcon /> },
    { name: 'Yahoo Backtest', path: '/yahoo-backtest', icon: <TimelineIcon /> },
    { name: 'Notifications', path: '/notifications', icon: <NotificationsIcon /> }
  ];

  const isActive = (path) => location.pathname === path;

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          Breakout Scanner
        </Typography>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem 
            key={item.name} 
            component={RouterLink} 
            to={item.path}
            onClick={handleDrawerToggle}
            sx={{ 
              backgroundColor: isActive(item.path) ? 'rgba(63, 81, 181, 0.1)' : 'transparent',
              borderRadius: 1,
              m: 1,
              '&:hover': {
                backgroundColor: 'rgba(63, 81, 181, 0.1)',
              }
            }}
          >
            <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.name} 
              primaryTypographyProps={{ 
                fontWeight: isActive(item.path) ? 'bold' : 'normal',
                color: isActive(item.path) ? 'primary.main' : 'inherit'
              }} 
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <AppBar position="static" elevation={3} sx={{ mb: 4, backgroundColor: 'background.paper' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: { xs: 1, md: 0 } }}>
          <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 'bold',
              display: { xs: 'block', md: 'block' },
              mr: 2
            }}
          >
            Breakout Scanner
          </Typography>
        </Box>

        {/* Mobile menu icon */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Desktop navigation links */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1, justifyContent: 'flex-end' }}>
          {navItems.map((item) => (
            <Button 
              key={item.name}
              component={RouterLink} 
              to={item.path}
              color="inherit"
              startIcon={item.icon}
              sx={{ 
                mx: 0.5, 
                borderRadius: 2,
                fontWeight: isActive(item.path) ? 'bold' : 'normal',
                backgroundColor: isActive(item.path) ? 'rgba(63, 81, 181, 0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(63, 81, 181, 0.2)',
                }
              }}
            >
              {item.name}
            </Button>
          ))}
        </Box>
      </Toolbar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
};

export default Navbar; 