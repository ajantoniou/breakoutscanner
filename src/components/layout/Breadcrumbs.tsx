import React from 'react';
import {
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
  Box,
  useTheme
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();

  // Convert path to breadcrumb items
  const pathnames = location.pathname.split('/').filter((x) => x);
  
  // Map route to display name
  const getDisplayName = (path: string): string => {
    const routeMap: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'scanner': 'Scanner',
      'golden-scanner': 'Golden Scanner',
      'day-scanner': 'Day Scanner',
      'swing-scanner': 'Swing Scanner',
      'backtest': 'Backtest',
      'results': 'Results',
      'analytics': 'Analytics',
      'notifications': 'Notifications',
      'settings': 'Settings'
    };
    
    return routeMap[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <Box 
      sx={{ 
        mb: 3,
        p: 1.5,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: theme.shadows[2]
      }}
    >
      <MuiBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
      >
        <Link
          component={RouterLink}
          to="/"
          color="inherit"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline'
            }
          }}
        >
          <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />
          Home
        </Link>
        
        {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          
          return isLast ? (
            <Typography 
              key={name}
              color="text.primary"
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                fontWeight: 500
              }}
            >
              {getDisplayName(name)}
            </Typography>
          ) : (
            <Link
              key={name}
              component={RouterLink}
              to={routeTo}
              color="inherit"
              sx={{
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              {getDisplayName(name)}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

export default Breadcrumbs; 