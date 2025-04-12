import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { DEMO_EMAIL, DEMO_PASSWORD, authService } from '@/services/auth/authService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { signIn } = useAuth();
  
  // Effect to create demo user on component mount
  useEffect(() => {
    const createDemoUserOnMount = async () => {
      try {
        console.log('Attempting to create demo user on mount...');
        await authService.createDemoUser();
      } catch (err) {
        console.error('Error ensuring demo user exists:', err);
      }
    };
    
    createDemoUserOnMount();
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        throw new Error(signInError.message || 'Failed to sign in');
      }
      
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUseDemoCredentials = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };
  
  const handleCreateDemoAccount = async () => {
    setCreatingDemo(true);
    setError('');
    
    try {
      const { error, user } = await authService.createDemoUser();
      
      if (error) {
        throw new Error(error.message || 'Failed to create demo account');
      }
      
      if (user) {
        setEmail(DEMO_EMAIL);
        setPassword(DEMO_PASSWORD);
        alert('Demo account created successfully! You can now log in with the demo credentials.');
      } else {
        alert('Demo account already exists. You can use the demo credentials to log in.');
        setEmail(DEMO_EMAIL);
        setPassword(DEMO_PASSWORD);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingDemo(false);
    }
  };
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          width: '100%', 
          maxWidth: 400,
          borderRadius: 2
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Breakout Scanner
        </Typography>
        
        <Typography variant="h6" component="h2" gutterBottom align="center">
          Login
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Login successful!
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'LOGIN'}
          </Button>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              Demo credentials:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Email: {DEMO_EMAIL}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Password: {DEMO_PASSWORD}
            </Typography>
            
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={handleUseDemoCredentials}
                disabled={loading}
              >
                Use Demo Credentials
              </Button>
              
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={handleCreateDemoAccount}
                disabled={loading || creatingDemo}
              >
                {creatingDemo ? <CircularProgress size={20} /> : 'Create Demo Account'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
