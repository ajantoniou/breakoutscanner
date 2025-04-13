import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { DEMO_EMAIL, DEMO_PASSWORD, supabase } from '@/services/auth/authService';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  
  // Effect to check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          console.log('User is already logged in, redirecting to golden-scanner');
          navigate('/golden-scanner');
        } else {
          // Create demo account if needed
          await ensureDemoAccount();
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  // Function to ensure demo account exists
  const ensureDemoAccount = async () => {
    try {
      console.log('Checking if demo account exists...');
      // First try to sign in with demo credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      
      // If sign-in fails, create the user
      if (signInError) {
        console.log('Demo user not found, creating new demo user');
        const { error: signUpError } = await supabase.auth.signUp({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          options: {
            data: {
              username: 'Demo User',
              role: 'user',
            },
          },
        });
        
        if (signUpError) {
          console.error('Error creating demo user:', signUpError);
        } else {
          console.log('Demo user created successfully');
          // Sign out immediately so we don't auto-login to the demo account
          await supabase.auth.signOut();
        }
      } else {
        console.log('Demo user exists and credentials are valid');
        // Sign out immediately so we don't auto-login to the demo account
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Error ensuring demo account:', err);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      console.log(`Attempting to sign in with email: ${email}, password length: ${password.length}`);
      
      // Direct Supabase auth call to avoid any middleware issues
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        console.error("Login error:", signInError);
        
        // Special case for demo login
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          console.log("Special case: Demo credentials failed, recreating demo account");
          // Try to create a new demo account if login fails
          await supabase.auth.signUp({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
            options: {
              data: {
                username: 'Demo User',
                role: 'user',
              },
            },
          });
          
          // Try login again
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
          });
          
          if (retryError) {
            throw new Error("Could not create or log in with demo account");
          } else {
            console.log("Successfully created and logged in with demo account");
            setSuccess(true);
            setTimeout(() => {
              navigate('/golden-scanner');
            }, 1000);
            return;
          }
        }
        
        throw new Error(signInError.message || 'Failed to sign in');
      }
      
      console.log('Login successful, redirecting to golden-scanner');
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
  
  // Special function for one-click demo login
  const handleDemoLogin = async () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setLoading(true);
    
    try {
      // Directly use demo credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      
      if (signInError) {
        console.log("Demo login failed, trying to create demo account");
        // Try to create the demo account
        await supabase.auth.signUp({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          options: {
            data: {
              username: 'Demo User',
              role: 'user',
            },
          },
        });
        
        // Try login again
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
        
        if (retryError) {
          throw new Error("Could not create or log in with demo account");
        }
      }
      
      console.log('Demo login successful, redirecting to golden-scanner');
      setSuccess(true);
      
      // Navigate to the golden scanner page after successful login
      setTimeout(() => {
        navigate('/golden-scanner');
      }, 1000);
    } catch (err) {
      console.error("Demo login error:", err);
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
        backgroundColor: '#121212'
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
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ color: '#3f51b5' }}>
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
        
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          onClick={handleDemoLogin}
          disabled={loading}
          sx={{ mb: 3 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Quick Login with Demo Account'}
        </Button>
        
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
