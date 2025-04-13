import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Navbar = () => {
  return (
    <AppBar position="static" sx={{ mb: 4 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Breakout Scanner
        </Typography>
        <Box>
          <Button color="inherit" component={RouterLink} to="/golden-scanner">Golden Scanner</Button>
          <Button color="inherit" component={RouterLink} to="/scanner">Day/Swing Scanner</Button>
          <Button color="inherit" component={RouterLink} to="/backtest">Backtest</Button>
          <Button color="inherit" component={RouterLink} to="/yahoo-backtest">Yahoo Backtest</Button>
          <Button color="inherit" component={RouterLink} to="/notifications">Notifications</Button>
          {/* Add Logout functionality later if needed */}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 