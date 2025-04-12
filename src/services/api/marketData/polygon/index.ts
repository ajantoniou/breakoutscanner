
// Export data fetching functions from dataFetcher
import { 
  fetchStockData as fetchPolygonStockDataInternal, 
  fetchBatchStockData as fetchPolygonBatchStockDataInternal
} from './dataFetcher';

// Export data transformation functions
import { 
  transformPolygonData, 
  processPolygonDataForBacktest, 
  processApiDataForBacktest 
} from './dataTransformer';

// Export the Polygon API client and its functions
import {
  PolygonApiClient,
  fetchStockDataPolygon,
  fetchBatchStockDataPolygon
} from './polygonApiClient';

// Export with clear naming convention
export {
  // Data fetcher exports
  fetchPolygonStockDataInternal,
  fetchPolygonBatchStockDataInternal,
  
  // Data transformer exports
  transformPolygonData,
  processPolygonDataForBacktest,
  processApiDataForBacktest,
  
  // API client exports
  PolygonApiClient,
  fetchStockDataPolygon,
  fetchBatchStockDataPolygon
};
