import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Box,
  Chip,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { PatternData } from '@/services/types/patternTypes';

export interface ExitAlert {
  alertId: string;
  symbol: string;
  exitPrice: number;
  trendlinePrice: number;
  status: 'active' | 'triggered';
  createdAt: Date;
  pattern: PatternData;
}

interface ExitAlertsListProps {
  alerts: ExitAlert[];
  onDeleteAlert: (alertId: string) => void;
  onClearAllAlerts: () => void;
}

const ExitAlertsList: React.FC<ExitAlertsListProps> = ({
  alerts,
  onDeleteAlert,
  onClearAllAlerts
}) => {
  if (alerts.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No exit alerts set. Click 'Exit Alert' on a pattern to create one.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Exit Alerts</Typography>
        <Button 
          variant="outlined" 
          color="secondary" 
          size="small" 
          onClick={onClearAllAlerts}
          disabled={alerts.length === 0}
        >
          Clear All
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Exit Price</TableCell>
              <TableCell>Trendline Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow
                key={alert.alertId}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  <Typography variant="body2" fontWeight="bold">
                    {alert.symbol}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    ${alert.exitPrice.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    ${alert.trendlinePrice.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={alert.status}
                    size="small"
                    color={alert.status === 'triggered' ? 'warning' : 'success'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {format(alert.createdAt, 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDeleteAlert(alert.alertId)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ExitAlertsList; 