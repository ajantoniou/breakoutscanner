export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  polygon: {
    apiKey: process.env.POLYGON_API_KEY || '',
  },
};

export default config; 