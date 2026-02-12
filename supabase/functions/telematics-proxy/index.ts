import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEMATICS_API_BASE = 'https://api-emea04.telematics.guru';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TELEMATICS_SYSTEM_USER = Deno.env.get('TELEMATICS_SYSTEM_USER');
const TELEMATICS_SYSTEM_PASS = Deno.env.get('TELEMATICS_SYSTEM_PASS');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telematics-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Types for JWT and auth response
type JWTPayload = { iat?: number; exp?: number; [key: string]: unknown } | null;
interface AuthResponse { access_token?: string; expires_in?: number; [key: string]: unknown }

// Add JWT decoding function
function decodeJWT(token: string): JWTPayload {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

// Fix token expiration times
function fixTokenExpiration<T extends AuthResponse>(data: T): T {
  if (!data.access_token) return data;
  
  const decoded = decodeJWT(data.access_token);
  if (!decoded) return data;
  
  console.log('Original token expiration:', {
    iat: decoded?.iat,
    exp: decoded?.exp,
    iat_date: decoded?.iat ? new Date(decoded.iat * 1000).toISOString() : 'n/a',
    exp_date: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : 'n/a',
  });
  
  // Check if timestamps are from the future (incorrect server time)
  const now = Math.floor(Date.now() / 1000);
  const isFutureToken = (decoded?.iat ?? 0) > now;
  
  if (isFutureToken) {
    console.log('Token has future timestamps - adjusting...');
    
    // Calculate offset (assume server is ~10 years in the future)
    const offset = (decoded?.iat ?? now) - now;
    
    // Adjust timestamps
    const adjustedIat = (decoded?.iat ?? now) - offset;
    const adjustedExp = (decoded?.exp ?? now + 3600) - offset;
    
    console.log('Adjusted token expiration:', {
      adjustedIat,
      adjustedExp,
      iat_date: new Date(adjustedIat * 1000).toISOString(),
      exp_date: new Date(adjustedExp * 1000).toISOString(),
    });
    
    // Note: We can't actually modify the JWT (it's signed)
    // But we can adjust the expires_in value to match reality
    if (data.expires_in) {
      const originalExpiresIn = data.expires_in;
      const actualExpiresIn = Math.max(3600, 86400); // Default to 1 hour or 24 hours
      data.expires_in = actualExpiresIn;
      console.log(`Adjusted expires_in from ${originalExpiresIn} to ${actualExpiresIn}`);
    }
  }
  
  return data;
}

// Cache for system token
let systemToken: string | null = null;
let systemTokenExpiry: number | null = null;

async function getSystemToken(): Promise<string | null> {
  if (systemToken && systemTokenExpiry && Date.now() < systemTokenExpiry) {
    return systemToken;
  }

  if (!TELEMATICS_SYSTEM_USER || !TELEMATICS_SYSTEM_PASS) {
    console.error('System telematics credentials not configured');
    return null;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('Username', TELEMATICS_SYSTEM_USER);
    formData.append('Password', TELEMATICS_SYSTEM_PASS);

    const response = await fetch(`${TELEMATICS_API_BASE}/v1/user/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!response.ok) {
      console.error('System auth failed:', response.status);
      return null;
    }

    const rawData = await response.json();
    const data = fixTokenExpiration(rawData);
    
    systemToken = data.access_token;
    
    // Use expires_in for cache, not JWT expiration
    if (data.expires_in) {
      systemTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    } else {
      systemTokenExpiry = Date.now() + (3600 * 1000); // Default 1 hour
    }
    
    return systemToken;
  } catch (error) {
    console.error('System auth error:', error);
    return null;
  }
}

// Add automatic token refresh for user requests
async function makeTelematicsRequest(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  
  // If token expired, try to get a new one and retry (only for system token)
  if (response.status === 401 && token === systemToken) {
    console.log('System token expired, refreshing...');
    systemToken = null;
    systemTokenExpiry = null;
    const newToken = await getSystemToken();
    if (newToken) {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
          'Accept': 'application/json',
        },
      });
    }
  }
  
  return response;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (body.action === 'authenticate') {
      if (!body.username || !body.password) {
        return new Response(
          JSON.stringify({ error: 'Username and password required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const formData = new URLSearchParams();
      formData.append('Username', body.username);
      formData.append('Password', body.password);

      const response = await fetch(`${TELEMATICS_API_BASE}/v1/user/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Telematics auth failed:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Authentication failed', status: response.status }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rawData = await response.json();
      const fixedData = fixTokenExpiration(rawData);
      
      // Add a client-side validation timestamp
      fixedData.client_valid_until = Date.now() + (fixedData.expires_in * 1000);
      
      return new Response(
        JSON.stringify(fixedData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getOrganisations') {
      if (!body.token) {
        return new Response(
          JSON.stringify({ error: 'Token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/user/organisation`,
        body.token
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Telematics getOrganisations failed:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch organisations', status: response.status }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getAssets') {
      if (!body.token || !body.organisationId) {
        return new Response(
          JSON.stringify({ error: 'Token and organisationId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/organisation/${body.organisationId}/asset`,
        body.token
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Telematics getAssets failed:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch assets', status: response.status }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getAssetDetails') {
      if (!body.token || !body.assetId) {
        return new Response(
          JSON.stringify({ error: 'Token and assetId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/asset/${body.assetId}`,
        body.token
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Telematics getAssetDetails failed:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch asset details', status: response.status }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getAssetByShareToken') {
      if (!body.shareToken) {
        return new Response(
          JSON.stringify({ error: 'Share token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create Supabase client
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      const { data: shareLink, error: linkError } = await supabase
        .from('tracking_share_links')
        .select(`
          *,
          load:loads(
            load_id,
            origin,
            destination,
            loading_date,
            offloading_date,
            cargo_type,
            status,
            driver:drivers!loads_driver_id_fkey(name, contact),
            fleet_vehicle:fleet_vehicles(vehicle_id, type, telematics_asset_id)
          )
        `)
        .eq('token', body.shareToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (linkError || !shareLink) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired share token', details: linkError?.message }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const assetIdToFetch = body.assetId 
        ? String(body.assetId) 
        : (shareLink.load?.fleet_vehicle?.telematics_asset_id || shareLink.telematics_asset_id);
      
      if (!assetIdToFetch) {
        return new Response(
          JSON.stringify({ error: 'No telematics asset ID available for this tracking link' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const assetIdNum = parseInt(assetIdToFetch);
      if (isNaN(assetIdNum)) {
        return new Response(
          JSON.stringify({ error: 'Invalid asset ID format', assetId: assetIdToFetch }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sysToken = await getSystemToken();
      if (!sysToken) {
        return new Response(
          JSON.stringify({ error: 'Tracking service unavailable - system credentials not configured' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/asset/${assetIdNum}`,
        sysToken
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Telematics API error:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch vehicle position', status: response.status, details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rawData = await response.json();
      const assetData = rawData.Assets?.[0] || rawData;
      
      const normalizedAsset = {
        id: assetData.Id ?? assetData.id ?? assetIdNum,
        name: assetData.Name || assetData.name || shareLink.load?.fleet_vehicle?.vehicle_id || 'Vehicle',
        code: assetData.Code || assetData.code || `ASSET-${assetIdNum}`,
        lastLatitude: assetData.LastLatitude ?? assetData.lastLatitude ?? null,
        lastLongitude: assetData.LastLongitude ?? assetData.lastLongitude ?? null,
        heading: assetData.Heading ?? assetData.heading ?? 0,
        speedKmH: assetData.SpeedKmH ?? assetData.speedKmH ?? 0,
        inTrip: assetData.InTrip ?? assetData.inTrip ?? false,
        isEnabled: assetData.IsEnabled ?? assetData.isEnabled ?? true,
        lastConnectedUtc: assetData.LastConnectedUtc || assetData.lastConnectedUtc || new Date().toISOString(),
        statusHumanized: assetData.StatusHumanized || assetData.statusHumanized || null,
      };
      
      return new Response(
        JSON.stringify(normalizedAsset),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getGeofences') {
      if (!body.token || !body.organisationId) {
        return new Response(
          JSON.stringify({ error: 'Token and organisationId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/organisation/${body.organisationId}/geofence`,
        body.token
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Telematics getGeofences failed:', response.status, errorText);
        
        if (response.status === 404) {
          return new Response(
            JSON.stringify([]),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to fetch geofences', status: response.status }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getGeofenceDetails') {
      if (!body.token || !body.geofenceId) {
        return new Response(
          JSON.stringify({ error: 'Token and geofenceId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/geofence/${body.geofenceId}`,
        body.token
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Telematics getGeofenceDetails failed:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch geofence details', status: response.status }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});