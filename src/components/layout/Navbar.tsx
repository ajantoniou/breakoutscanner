import React, { useState, useEffect, useMemo } from 'react';
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
  Container,
  Collapse,
  ListItemButton,
  alpha,
  Chip,
  Menu,
  MenuItem
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TableChartIcon from '@mui/icons-material/TableChart';
import StoreIcon from '@mui/icons-material/Store';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import LogoutIcon from '@mui/icons-material/Logout';
import ScannerIcon from '@mui/icons-material/Scanner';

// Navigation groups with nested items
const navGroups = [
  {
    id: 'main',
    items: [
      { 
        name: 'Dashboard', 
        path: '/dashboard', 
        icon: <DashboardIcon />, 
        description: 'Overview of all scanner activity'
      }
    ]
  },
  {
    id: 'scanners',
    label: 'Scanners',
    icon: <ScannerIcon />,
    items: [
      { 
        name: 'Golden Scanner', 
        path: '/golden-scanner', 
        icon: <StarIcon />, 
        description: 'High-confidence predictions',
        badge: 'New' 
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
      }
    ]
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: <AssessmentIcon />,
    items: [
      { 
        name: 'Backtests', 
        path: '/backtest', 
        icon: <HistoryIcon />, 
        description: 'Historical pattern performance'
      },
      { 
        name: 'Performance', 
        path: '/performance', 
        icon: <AutoGraphIcon />, 
        description: 'Strategy performance metrics'
      },
      { 
        name: 'Pattern Database', 
        path: '/patterns', 
        icon: <TableChartIcon />, 
        description: 'View all detected patterns'
      }
    ]
  },
  {
    id: 'settings',
    items: [
      { 
        name: 'Settings', 
        path: '/settings', 
        icon: <SettingsIcon />, 
        description: 'Configure scanner preferences'
      }
    ]
  }
];

// Flatten all nav items for easier breadcrumb generation
const allNavItems = navGroups.flatMap(group => group.items);

interface NavbarProps {
  user?: {
    name: string;
    email: string;
    plan: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user = { name: 'Demo User', email: 'demo@example.com', plan: 'Free Plan' }, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [activePath, setActivePath] = useState('/');
  const [breadcrumbs, setBreadcrumbs] = useState<{ name: string; path: string }[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    scanners: true,
    analysis: false
  });
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationsMenuAnchor, setNotificationsMenuAnchor] = useState<null | HTMLElement>(null);
  const [hasNotifications, setHasNotifications] = useState(true);
  
  const notifications = [
    { id: 1, title: 'New Pattern Detected', message: 'AAPL: Bull Flag on 1h timeframe', time: '2 min ago', read: false },
    { id: 2, title: 'Breakout Alert', message: 'MSFT breakout confirmed', time: '1 hour ago', read: false },
    { id: 3, title: 'System Update', message: 'Scanner updated to v2.3.0', time: '1 day ago', read: true },
  ];
  
  const unreadNotifications = notifications.filter(n => !n.read).length;
  
  // Update active path when location changes
  useEffect(() => {
    setActivePath(location.pathname);
    generateBreadcrumbs(location.pathname);
  }, [location]);

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = (path: string) => {
    const breadcrumbItems = [{ name: 'Home', path: '/' }];
    
    // Find the matching navigation item
    const matchingItem = allNavItems.find(item => item.path === path);
    if (matchingItem) {
      // Find parent group
      const parentGroup = navGroups.find(group => 
        group.items.some(item => item.path === matchingItem.path)
      );
      
      // If there's a parent group with a label, add it to breadcrumbs
      if (parentGroup && parentGroup.label) {
        breadcrumbItems.push({ 
          name: parentGroup.label, 
          path: matchingItem.path // This makes the group breadcrumb point to the current page
        });
      }
      
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
  
  // Toggle expanded state of a navigation group
  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  // Handle user menu
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };
  
  // Handle notifications menu
  const handleNotificationsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsMenuAnchor(event.currentTarget);
  };
  
  const handleNotificationsMenuClose = () => {
    setNotificationsMenuAnchor(null);
  };
  
  // Determine if a group is active (any of its items is active)
  const isGroupActive = (groupItems: typeof allNavItems) => {
    return groupItems.some(item => isActive(item.path));
  };

  // Build the drawer content
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
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }} src={user?.avatar}>
            <PersonIcon />
          </Avatar>
        <Box>
            <Typography variant="subtitle2" fontWeight="bold">{user.name}</Typography>
            <Typography variant="caption" color="text.secondary">{user.plan}</Typography>
          </Box>
        </Box>
      </Box>
      
      <Divider />
      
      <List sx={{ px: 1 }} component="nav">
        {navGroups.map((group) => (
          <React.Fragment key={group.id}>
            {group.label ? (
              <Box key={group.id}>
                <ListItemButton 
                  onClick={() => toggleGroupExpanded(group.id)}
                  sx={{ 
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: isGroupActive(group.items) ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: '40px', color: isGroupActive(group.items) ? 'primary.main' : 'text.secondary' }}>
                    {group.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={group.label}
                    primaryTypographyProps={{ 
                      fontWeight: 'medium',
                      fontSize: '0.95rem'
                    }}
                  />
                  {expandedGroups[group.id] ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                
                <Collapse in={expandedGroups[group.id]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {group.items.map((item) => (
                      <ListItemButton
                        key={item.name}
                        component={RouterLink}
                        to={item.path}
                        onClick={handleDrawerToggle}
                        sx={{ 
                          pl: 4,
                          borderRadius: 1,
                          mb: 0.5,
                          backgroundColor: isActive(item.path) ? 'primary.lighter' : 'transparent',
                          color: isActive(item.path) ? 'primary.main' : 'text.primary',
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
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {item.name}
                              {item.badge && (
                                <Chip 
                                  label={item.badge} 
                                  size="small" 
                                  color="primary" 
                                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          }
                          secondary={item.description}
                          primaryTypographyProps={{ 
                            fontWeight: isActive(item.path) ? 'bold' : 'medium',
                            fontSize: '0.9rem'
                          }}
                          secondaryTypographyProps={{
                            fontSize: '0.75rem'
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </Box>
            ) : (
              // Render items without a group label directly
              group.items.map((item) => (
                <ListItemButton
                  key={item.name}
                  component={RouterLink}
                  to={item.path}
                  onClick={handleDrawerToggle}
                  sx={{ 
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: isActive(item.path) ? 'primary.lighter' : 'transparent',
                    color: isActive(item.path) ? 'primary.main' : 'text.primary',
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
                </ListItemButton>
              ))
            )}
          </React.Fragment>
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
        
        {onLogout && (
          <Button
            variant="text"
            color="secondary"
            fullWidth
            startIcon={<LogoutIcon />}
            onClick={onLogout}
            sx={{ mt: 1 }}
          >
            Sign Out
          </Button>
        )}
      </Box>
    </Box>
  );

  // Build breadcrumbs component
  const breadcrumbComponent = useMemo(() => (
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
  ), [breadcrumbs]);

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
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: { xs: 1, md: 0 } }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { xs: 'flex', lg: 'none' }, mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
            
            <RouterLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon sx={{ mr: 0.5, color: 'primary.main' }} />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  color: 'text.primary',
                  display: { xs: isSmall ? 'none' : 'block', sm: 'block' },
                  mr: 2,
                  fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' }
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
              backgroundColor: 'background.default',
              flexGrow: 1,
              maxWidth: 'calc(100% - 500px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {breadcrumbComponent}
          </Box>

          {/* Right side icons */}
          <Box sx={{ display: 'flex', marginLeft: 'auto', alignItems: 'center' }}>
            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotificationsMenuOpen}>
                <Badge badgeContent={unreadNotifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Settings">
              <IconButton
                color="inherit"
                component={RouterLink}
                to="/settings"
                sx={{ mx: { xs: 0.5, sm: 1 } }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            
            <Box 
              onClick={handleUserMenuOpen}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                ml: 1,
                p: 0.5,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <Avatar 
                sx={{ 
                  width: { xs: 32, sm: 36 }, 
                  height: { xs: 32, sm: 36 }, 
                  bgcolor: 'primary.main' 
                }}
                src={user?.avatar}
              >
                <PersonIcon sx={{ fontSize: '1.2rem' }} />
              </Avatar>
              
              <Box sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle2" noWrap>{user.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user.plan}
                </Typography>
              </Box>
              
              <KeyboardArrowDownIcon 
                fontSize="small" 
                sx={{ 
                  ml: 0.5, 
                  color: 'text.secondary',
                  display: { xs: 'none', sm: 'block' }
                }} 
              />
            </Box>
        </Box>
      </Toolbar>
    </AppBar>

      {/* Dropdown user menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          elevation: 2,
          sx: { minWidth: 200 }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">{user.name}</Typography>
          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
        </Box>
        <Divider />
        <MenuItem 
          onClick={() => {
            navigate('/profile');
            handleUserMenuClose();
          }}
          dense
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => {
            navigate('/settings');
            handleUserMenuClose();
          }}
          dense
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        {onLogout && (
          <MenuItem 
            onClick={() => {
              onLogout();
              handleUserMenuClose();
            }}
            dense
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sign Out</ListItemText>
          </MenuItem>
        )}
      </Menu>
      
      {/* Notifications menu */}
      <Menu
        anchorEl={notificationsMenuAnchor}
        open={Boolean(notificationsMenuAnchor)}
        onClose={handleNotificationsMenuClose}
        PaperProps={{
          elevation: 2,
          sx: { minWidth: 280, maxWidth: 320 }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2">Notifications</Typography>
          <Button size="small" color="primary">Mark all as read</Button>
        </Box>
        <Divider />
        {notifications.length > 0 ? (
          <>
            {notifications.map(notification => (
              <MenuItem 
                key={notification.id}
                onClick={handleNotificationsMenuClose}
                dense
                sx={{ 
                  py: 1,
                  px: 2,
                  backgroundColor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.05)
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" noWrap>{notification.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{notification.time}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {notification.message}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
            <Divider />
            <Box sx={{ p: 1 }}>
              <Button 
                fullWidth 
                size="small" 
                onClick={() => {
                  navigate('/notifications');
                  handleNotificationsMenuClose();
                }}
              >
                View All
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ py: 2, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        )}
      </Menu>

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
      
      {/* Mobile breadcrumbs - only visible on small/medium screens */}
      {!isMobile && (
        <Box sx={{ 
          position: 'fixed',
          top: 64, // Height of AppBar
          left: { xs: 0, lg: 280 }, // Align with content on desktop
          right: 0,
          zIndex: 1099,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          px: 2,
          py: 1,
          display: { xs: 'flex', md: 'none' }
        }}>
          {breadcrumbComponent}
        </Box>
      )}
      
      {/* Main content padding to account for the fixed AppBar */}
      <Box component="main" sx={{ 
        flexGrow: 1, 
        pt: { xs: 9, md: 10 }, // Extra padding on mobile for breadcrumbs
        pl: { lg: '280px' }, // Account for persistent drawer width on large screens
        minHeight: '100vh'
      }}>
        {/* Main content will be rendered here via outlet */}
      </Box>
    </>
  );
};

export default Navbar; 