import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  useMediaQuery,
  useTheme,
  Breadcrumbs,
  Link,
  Paper,
  Badge,
  Tooltip,
  Avatar,
  Container
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import HistoryIcon from '@mui/icons-material/History';
import TimelineIcon from '@mui/icons-material/Timeline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import PersonIcon from '@mui/icons-material/Person';

// Main navigation items
const navItems = [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: <DashboardIcon />, 
    description: 'Overview of all scanner activity'
  },
  { 
    name: 'Golden Scanner', 
    path: '/golden-scanner', 
    icon: <StarIcon />, 
    description: 'High-confidence predictions' 
  },
  { 
    name: 'Day Scanner', 
    path: '/day-scanner', 
    icon: <ShowChartIcon />, 
    description: 'Intraday trading signals' 
  },
  { 
    name: 'Swing Scanner', 
    path: '/swing-scanner', 
    icon: <TrendingUpIcon />, 
    description: 'Position trading signals'
  },
  { 
    name: 'Backtests', 
    path: '/backtest', 
    icon: <HistoryIcon />, 
    description: 'Historical pattern performance'
  },
  { 
    name: 'Settings', 
    path: '/settings', 
    icon: <SettingsIcon />, 
    description: 'Configure scanner preferences'
  }
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activePath, setActivePath] = useState('/');
  const [breadcrumbs, setBreadcrumbs] = useState<{ name: string; path: string }[]>([]);
  const [hasNotifications, setHasNotifications] = useState(true);
  
  // Update active path when location changes
  useEffect(() => {
    setActivePath(location.pathname);
    generateBreadcrumbs(location.pathname);
  }, [location]);

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = (path: string) => {
    const breadcrumbItems = [{ name: 'Home', path: '/' }];
    
    // Find the matching navigation item
    const matchingItem = navItems.find(item => item.path === path);
    if (matchingItem) {
      breadcrumbItems.push({ name: matchingItem.name, path: matchingItem.path });
    } else {
      // Handle special cases or nested routes
      if (path.startsWith('/scanner')) {
        breadcrumbItems.push({ name: 'Scanners', path: '/scanner' });
        
        if (path !== '/scanner') {
          // Extract subpage name
          const subpage = path.split('/').pop() || '';
          breadcrumbItems.push({ 
            name: subpage.charAt(0).toUpperCase() + subpage.slice(1), 
            path 
          });
        }
      }
      // Add more special case handling as needed
    }
    
    setBreadcrumbs(breadcrumbItems);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isActive = (path: string) => activePath === path;

  const drawer = (
    <Box sx={{ width: 280 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          p: 2,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TrendingUpIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Breakout Scanner
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle} sx={{ color: 'primary.contrastText' }}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">Demo User</Typography>
            <Typography variant="caption" color="text.secondary">Free Plan</Typography>
          </Box>
        </Box>
      </Box>
      
      <Divider />
      
      <List sx={{ px: 1 }}>
        {navItems.map((item) => (
          <ListItem 
            key={item.name} 
            component={RouterLink} 
            to={item.path}
            onClick={handleDrawerToggle}
            sx={{ 
              backgroundColor: isActive(item.path) ? 'primary.lighter' : 'transparent',
              color: isActive(item.path) ? 'primary.main' : 'text.primary',
              borderRadius: 1,
              mb: 0.5,
              py: 1,
              '&:hover': {
                backgroundColor: 'primary.lighter',
              }
            }}
          >
            <ListItemIcon sx={{ 
              color: isActive(item.path) ? 'primary.main' : 'text.secondary',
              minWidth: '40px'
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.name} 
              secondary={item.description}
              primaryTypographyProps={{ 
                fontWeight: isActive(item.path) ? 'bold' : 'medium',
                fontSize: '0.95rem'
              }}
              secondaryTypographyProps={{
                fontSize: '0.75rem'
              }}
            />
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ mt: 2 }} />
      
      <Box sx={{ p: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          fullWidth
          startIcon={<QuestionMarkIcon />}
          component={RouterLink}
          to="/help"
          onClick={handleDrawerToggle}
        >
          Help & Support
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="fixed" 
        elevation={0} 
        sx={{ 
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.drawer + 1 
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: { xs: 1, md: 0 } }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { xs: 'flex', lg: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            
            <RouterLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  color: 'text.primary',
                  display: { xs: 'none', sm: 'block' },
                  mr: 2
                }}
              >
                Breakout Scanner
              </Typography>
            </RouterLink>
          </Box>

          {/* Breadcrumbs navigation */}
          <Box 
            component={Paper} 
            elevation={0}
            sx={{ 
              display: { xs: 'none', md: 'flex' }, 
              px: 2, 
              py: 0.5, 
              borderRadius: 2,
              backgroundColor: 'background.default'
            }}
          >
            <Breadcrumbs 
              separator={<NavigateNextIcon fontSize="small" />} 
              aria-label="breadcrumb"
            >
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return isLast ? (
                  <Typography key={crumb.path} color="text.primary" fontWeight="medium">
                    {crumb.name}
                  </Typography>
                ) : (
                  <Link
                    key={crumb.path}
                    component={RouterLink}
                    to={crumb.path}
                    color="inherit"
                    underline="hover"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    {index === 0 && <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />}
                    {crumb.name}
                  </Link>
                );
              })}
            </Breadcrumbs>
          </Box>

          {/* Right side icons */}
          <Box sx={{ display: 'flex', marginLeft: 'auto' }}>
            <Tooltip title="Notifications">
              <IconButton color="inherit">
                <Badge badgeContent={hasNotifications ? "4" : "0"} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Settings">
              <IconButton
                color="inherit"
                component={RouterLink}
                to="/settings"
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Profile">
              <IconButton
                color="inherit"
                component={RouterLink}
                to="/profile"
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  <PersonIcon sx={{ fontSize: '1.2rem' }} />
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Desktop Side Navigation (persistent on larger screens) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            borderRight: '1px solid',
            borderColor: 'divider',
            pt: 8 // Account for AppBar height
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Main content padding to account for the fixed AppBar */}
      <Box component="main" sx={{ 
        flexGrow: 1, 
        pt: 10, // Account for AppBar height
        pl: { lg: '280px' }, // Account for persistent drawer width on large screens
        minHeight: '100vh'
      }}>
        {/* Main content will be rendered here via outlet */}
      </Box>
    </>
  );
};

export default Navbar; 