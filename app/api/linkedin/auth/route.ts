import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/linkedin/callback';

// Initiate the LinkedIn OAuth flow
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    if (!LINKEDIN_CLIENT_ID) {
      return NextResponse.json(
        { error: "LinkedIn Client ID is not configured" },
        { status: 500 }
      );
    }
    
    // Create the LinkedIn authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', LINKEDIN_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', LINKEDIN_REDIRECT_URI);
    authUrl.searchParams.append('state', userId); // Use userId as state for security
    authUrl.searchParams.append('scope', 'w_member_social');
    
    // Redirect user to LinkedIn authorization page
    return NextResponse.json({
      authUrl: authUrl.toString()
    });
    
  } catch (error: unknown) {
    console.error("[LINKEDIN_AUTH_ERROR]", error);
    return NextResponse.json(
      { 
        error: "Failed to generate LinkedIn auth URL", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 