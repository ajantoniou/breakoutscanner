import React, { useState, useEffect } from 'react';
import { useAuth } from '@/services/auth/authService';
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { DEMO_EMAIL, DEMO_PASSWORD, authService } from '@/services/auth/authService';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  
  // Effect to create demo user on component mount and prefill credentials
  useEffect(() => {
    const createDemoUserOnMount = async () => {
      try {
        console.log('Attempting to create demo user on mount...');
        await authService.createDemoUser();
        
        // Prefill demo credentials for easier login
        setEmail(DEMO_EMAIL);
        setPassword(DEMO_PASSWORD);
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
      console.log(`Attempting to sign in with email: ${email}`);
      const { error: signInError } = await authService.signIn(email, password);
      
      if (signInError) {
        console.error("Login error:", signInError);
        throw new Error(signInError.message || 'Failed to sign in');
      }
      
      setSuccess(true);
      
      // Navigate to the golden scanner page after successful login
      setTimeout(() => {
        navigate('/golden-scanner');
      }, 1000);
      
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
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
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
