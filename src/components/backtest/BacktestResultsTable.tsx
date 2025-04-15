import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Box,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TimelineIcon from '@mui/icons-material/Timeline';
import { BacktestResult } from '../../services/types/backtestTypes';

interface BacktestResultsTableProps {
  results: BacktestResult[];
  page: number;
  rowsPerPage: number;
  totalResults: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const BacktestResultsTable: React.FC<BacktestResultsTableProps> = ({
  results,
  page,
  rowsPerPage,
  totalResults,
  onPageChange,
  onRowsPerPageChange
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win':
        return <CheckCircleIcon color="success" />;
      case 'loss':
        return <CancelIcon color="error" />;
      case 'pending':
        return <HourglassEmptyIcon color="warning" />;
      default:
        return null;
    }
  };
  
  const getResultColor = (result: string) => {
    switch (result) {
      case 'win':
        return 'success';
      case 'loss':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  const getDirectionColor = (direction: string) => {
    return direction === 'bullish' ? 'success' : 'error';
  };
  
  const formatProfitLoss = (pl: number) => {
    const formatted = pl.toFixed(2) + '%';
    return pl >= 0 ? '+' + formatted : formatted;
  };
  
  return (
    <>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Pattern</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell>Timeframe</TableCell>
              <TableCell>Entry Date</TableCell>
              <TableCell>Entry Price</TableCell>
              <TableCell>Exit Date</TableCell>
              <TableCell>Exit Price</TableCell>
              <TableCell>P/L (%)</TableCell>
              <TableCell>R Multiple</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Result</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  <Typography sx={{ py: 2 }}>No backtest results found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              results.map((result) => (
                <TableRow key={result.id} hover>
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" fontWeight="bold">
                      {result.symbol}
                    </Typography>
                  </TableCell>
                  <TableCell>{result.patternType}</TableCell>
                  <TableCell>
                    <Chip 
                      label={result.direction} 
                      color={getDirectionColor(result.direction) as "success" | "error"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{result.timeframe}</TableCell>
                  <TableCell>{formatDate(result.entryDate)}</TableCell>
                  <TableCell>${result.entryPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    {result.exitDate ? formatDate(result.exitDate) : '-'}
                  </TableCell>
                  <TableCell>
                    {result.exitPrice ? `$${result.exitPrice.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ 
                      color: result.profitLossPercent >= 0 ? 'success.main' : 'error.main',
                      fontWeight: 'bold'
                    }}>
                      {formatProfitLoss(result.profitLossPercent)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {result.rMultiple ? result.rMultiple.toFixed(2) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={`${result.confidenceScore}%`} 
                      color={
                        result.confidenceScore >= 75 ? 'success' :
                        result.confidenceScore >= 50 ? 'primary' :
                        result.confidenceScore >= 25 ? 'warning' : 'error'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      icon={getResultIcon(result.result)}
                      label={result.result.charAt(0).toUpperCase() + result.result.slice(1)} 
                      color={getResultColor(result.result) as "success" | "error" | "warning" | "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Chart">
                      <IconButton size="small" onClick={() => console.log('View chart for', result.id)}>
                        <TimelineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={totalResults}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  );
};

export default BacktestResultsTable; 