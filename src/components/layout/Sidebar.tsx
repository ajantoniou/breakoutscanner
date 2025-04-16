import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  Collapse,
  alpha
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import StarIcon from '@mui/icons-material/Star';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TableChartIcon from '@mui/icons-material/TableChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import LogoutIcon from '@mui/icons-material/Logout';

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  onDrawerToggle: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: JSX.Element;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />
  },
  {
    name: 'Scanner',
    path: '/scanner',
    icon: <ShowChartIcon />,
    children: [
      {
        name: 'Golden Scanner',
        path: '/golden-scanner',
        icon: <StarIcon />
      },
      {
        name: 'Day Scanner',
        path: '/day-scanner',
        icon: <TableChartIcon />
      },
      {
        name: 'Swing Scanner',
        path: '/swing-scanner',
        icon: <AutoGraphIcon />
      }
    ]
  },
  {
    name: 'Backtest',
    path: '/backtest',
    icon: <HistoryIcon />,
    children: [
      {
        name: 'Results',
        path: '/backtest/results',
        icon: <AssessmentIcon />
      },
      {
        name: 'Analytics',
        path: '/backtest/analytics',
        icon: <TableChartIcon />
      }
    ]
  },
  {
    name: 'Notifications',
    path: '/notifications',
    icon: <NotificationsIcon />
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />
  }
];

const Sidebar: React.FC<SidebarProps> = ({
  drawerWidth,
  mobileOpen,
  onDrawerToggle
}) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const handleExpand = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: NavItem) => {
    if (isActive(item.path)) return true;
    return item.children?.some(child => isActive(child.path)) || false;
  };

  const NavItemComponent = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const active = isParentActive(item);
    const expanded = expandedItems.includes(item.name);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <>
        <ListItem 
          disablePadding 
          sx={{ 
            display: 'block',
            mb: hasChildren ? 0 : 0.5
          }}
        >
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleExpand(item.name);
              } else {
                navigate(item.path);
                if (isMobile) onDrawerToggle();
              }
            }}
            sx={{
              minHeight: 48,
              px: 2.5,
              py: 1.5,
              pl: depth * 3 + 2.5,
              backgroundColor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              },
              borderRadius: 1,
              mx: 1,
              mb: 0.5
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: active ? 'primary.main' : 'inherit'
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.name}
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? 'primary.main' : 'inherit'
              }}
            />
            {hasChildren && (
              expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
            )}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => (
                <NavItemComponent 
                  key={child.path} 
                  item={child} 
                  depth={depth + 1} 
                />
              ))}
            </List>
          </Collapse>
        )}
      </>
    );
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <ShowChartIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Breakout Scanner
        </Typography>
      </Box>

      {/* Navigation Items */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {navItems.map((item) => (
          <NavItemComponent key={item.path} item={item} />
        ))}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <ListItem 
          button
          sx={{ 
            borderRadius: 1,
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.main, 0.08),
            }
          }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            primaryTypographyProps={{
              color: 'error.main',
              fontWeight: 500
            }}
          />
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: 'background.paper',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider'
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar; 