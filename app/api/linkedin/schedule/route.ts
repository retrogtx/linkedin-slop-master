import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/clerk-sdk-node";

// This would typically connect to the LinkedIn API
// You'll need to follow LinkedIn's OAuth flow and use their API
// https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/creating-shares

// Define TypeScript interfaces for our LinkedIn API structures
interface ShareContent {
  shareCommentary: {
    text: string;
  };
  shareMediaCategory: string;
  media?: Array<{
    status: string;
    originalUrl: string;
  }>;
}

interface LinkedInPostData {
  author: string;
  lifecycleState: string;
  specificContent: {
    "com.linkedin.ugc.ShareContent": ShareContent;
  };
  visibility: {
    "com.linkedin.ugc.MemberNetworkVisibility": string;
  };
}

export async function POST(req: Request) {
  try {
    console.log("[LINKEDIN_SCHEDULE] Starting request");
    
    const { userId } = await auth();
    console.log("[LINKEDIN_SCHEDULE] User ID:", userId);
    
    if (!userId) {
      console.log("[LINKEDIN_SCHEDULE] No user ID found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Parse request body and log it
    const requestBody = await req.json();
    console.log("[LINKEDIN_SCHEDULE] Request body:", JSON.stringify(requestBody));
    
    // Get the current user to access their metadata
    const user = await currentUser();
    console.log("[LINKEDIN_SCHEDULE] User found:", !!user);
    
    if (!user) {
      console.log("[LINKEDIN_SCHEDULE] User not found");
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Log user metadata and OAuth accounts
    console.log("[LINKEDIN_SCHEDULE] User metadata:", {
      publicMetadata: user.publicMetadata,
      hasPrivateMetadata: !!user.privateMetadata,
      oauthAccounts: user.externalAccounts?.length
    });
    
    // Check for token in private metadata first (from explicit LinkedIn connect)
    if (user.privateMetadata && 
        typeof user.privateMetadata === 'object' && 
        'linkedInToken' in user.privateMetadata && 
        'linkedInId' in user.privateMetadata) {
      
      console.log("[LINKEDIN_SCHEDULE] Using token from Clerk privateMetadata");
      const token = user.privateMetadata.linkedInToken as string;
      const id = user.privateMetadata.linkedInId as string;
      
      return await createLinkedInPost(
        requestBody.postContent,
        token,
        id
      );
    }
    
    // Check for LinkedIn in external accounts
    let linkedInAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_linkedin'
    );
    
    if (linkedInAccount) {
      console.log("[LINKEDIN_SCHEDULE] Found LinkedIn account in Clerk, but no token available");
      // We can't directly access the OAuth token from Clerk's externalAccounts
    }
    
    // If no previous LinkedIn connection, check if we have token directly from frontend
    if (requestBody.linkedInToken && requestBody.authorId) {
      console.log("[LINKEDIN_SCHEDULE] Using token provided in request body");
      
      // Prepare the post with the manually provided credentials
      return await createLinkedInPost(
        requestBody.postContent,
        requestBody.linkedInToken,
        requestBody.authorId
      );
    }
    
    // Fall back to using organization credentials
    console.log("[LINKEDIN_SCHEDULE] Falling back to organization posting using client credentials");
    
    // Get LinkedIn credentials directly from environment variables if available
    if (process.env.LINKEDIN_TEST_TOKEN && process.env.LINKEDIN_TEST_USER_ID) {
      console.log("[LINKEDIN_SCHEDULE] Using test credentials from environment");
      
      return await createLinkedInPost(
        requestBody.postContent,
        process.env.LINKEDIN_TEST_TOKEN,
        process.env.LINKEDIN_TEST_USER_ID
      );
    }
    
    // Try the client credentials flow with organization ID
    console.log("[LINKEDIN_SCHEDULE] Using LinkedIn client credentials flow");
    
    // Use client credentials flow with your app
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      })
    });
    
    if (!tokenResponse.ok) {
      console.error("[LINKEDIN_TOKEN_ERROR]", await tokenResponse.text());
      return NextResponse.json(
        { error: "Failed to get LinkedIn access token. Please connect your LinkedIn account first by clicking the 'Connect LinkedIn' button at the top of the page." },
        { status: 500 }
      );
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // For client credentials flow, we need to use the organization ID
    // This is different from posting as a user
    const organizationId = process.env.LINKEDIN_ORGANIZATION_ID;
    
    if (!organizationId) {
      return NextResponse.json(
        { error: "LinkedIn organization ID not configured. Please connect your LinkedIn account first by clicking the 'Connect LinkedIn' button at the top of the page." },
        { status: 500 }
      );
    }
    
    return await createLinkedInPost(
      requestBody.postContent,
      accessToken,
      organizationId,
      true // is organization
    );
    
  } catch (error: unknown) {
    console.error("[LINKEDIN_SCHEDULE_ERROR]", error);
    return NextResponse.json(
      { 
        error: "Failed to publish post to LinkedIn. Please connect your LinkedIn account first by clicking the 'Connect LinkedIn' button at the top of the page.", 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

async function createLinkedInPost(
  postContent: string,
  accessToken: string,
  authorId: string,
  isOrganization: boolean = false
) {
  if (!postContent) {
    console.log("[LINKEDIN_SCHEDULE] No post content");
    return NextResponse.json(
      { error: "Post content is required" },
      { status: 400 }
    );
  }
  
  // Prepare the headers for LinkedIn API
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0'
  };

  // Prepare the post data for LinkedIn
  const authorType = isOrganization ? 'organization' : 'person';
  
  const postData: LinkedInPostData = {
    "author": `urn:li:${authorType}:${authorId}`,
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": {
          "text": postContent
        },
        "shareMediaCategory": "NONE"
      }
    },
    "visibility": {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  console.log("[LINKEDIN_SCHEDULE] Post data:", JSON.stringify(postData));

  // If there's a URL to share, add it to the post
  if (postContent.includes("http")) {
    // Extract URL from the post content (this is a simple approach, you might want to use a more robust method)
    const urlMatch = postContent.match(/(https?:\/\/[^\s]+)/g);
    if (urlMatch && urlMatch.length > 0) {
      const link = urlMatch[0];
      postData.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "ARTICLE";
      postData.specificContent["com.linkedin.ugc.ShareContent"].media = [
        {
          "status": "READY",
          "originalUrl": link
        }
      ];
      console.log("[LINKEDIN_SCHEDULE] Adding link:", link);
    }
  }

  // Post to LinkedIn API
  console.log("[LINKEDIN_SCHEDULE] Sending request to LinkedIn API");
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(postData)
  });

  const responseText = await response.text();
  console.log("[LINKEDIN_SCHEDULE] LinkedIn API response status:", response.status);
  console.log("[LINKEDIN_SCHEDULE] LinkedIn API response body:", responseText);

  if (!response.ok) {
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch (e) {
      errorData = { message: responseText };
    }
    
    console.error("[LINKEDIN_SCHEDULE] LinkedIn API error:", errorData);
    return NextResponse.json(
      { error: "LinkedIn API error", details: errorData },
      { status: response.status }
    );
  }

  let linkedInResponse;
  try {
    linkedInResponse = JSON.parse(responseText);
  } catch (e) {
    console.error("[LINKEDIN_SCHEDULE] Error parsing LinkedIn response:", e);
    linkedInResponse = { message: responseText };
  }
  
  console.log("[LINKEDIN_SCHEDULE] Success! LinkedIn post created");
  return NextResponse.json({
    success: true,
    message: "Post published successfully on LinkedIn",
    postId: linkedInResponse.id,
    response: linkedInResponse
  });
} 