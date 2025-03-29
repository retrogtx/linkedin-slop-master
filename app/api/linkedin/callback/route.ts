import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/clerk-sdk-node";

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/linkedin/callback';

// Handle the callback from LinkedIn OAuth
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // This should contain the userId
    const error = url.searchParams.get('error');
    
    // Handle LinkedIn auth errors
    if (error) {
      return NextResponse.redirect(
        `${url.origin}?error=${encodeURIComponent(error)}`
      );
    }
    
    if (!code || !state) {
      return NextResponse.redirect(
        `${url.origin}?error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[LINKEDIN_TOKEN_ERROR]', errorData);
      return NextResponse.redirect(
        `${url.origin}?error=${encodeURIComponent('Failed to get access token')}`
      );
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // Get user's LinkedIn profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!profileResponse.ok) {
      const errorData = await profileResponse.text();
      console.error('[LINKEDIN_PROFILE_ERROR]', errorData);
      return NextResponse.redirect(
        `${url.origin}?error=${encodeURIComponent('Failed to get LinkedIn profile')}`
      );
    }
    
    const profileData = await profileResponse.json();
    const linkedInId = profileData.sub; // The LinkedIn user ID
    
    // Store LinkedIn credentials with Clerk user
    try {
      // Use the state parameter as the userId from Clerk
      // @ts-ignore
      await clerkClient.users.updateUser(state, {
        publicMetadata: {
          linkedInConnected: true,
        },
        privateMetadata: {
          linkedInToken: accessToken,
          linkedInId: linkedInId,
          linkedInTokenExpiry: Date.now() + (tokenData.expires_in * 1000),
        }
      });
    } catch (err) {
      console.error('[CLERK_UPDATE_ERROR]', err);
      return NextResponse.redirect(
        `${url.origin}?error=${encodeURIComponent('Failed to save LinkedIn credentials')}`
      );
    }
    
    // Redirect back to the application
    return NextResponse.redirect(`${url.origin}/dashboard?linkedin=connected`);
    
  } catch (error: unknown) {
    console.error("[LINKEDIN_CALLBACK_ERROR]", error);
    // Redirect with error
    const url = new URL(req.url);
    return NextResponse.redirect(
      `${url.origin}?error=${encodeURIComponent('Failed to complete LinkedIn authentication')}`
    );
  }
} 