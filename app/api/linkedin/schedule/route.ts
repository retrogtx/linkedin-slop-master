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
    
    // Check for token in private metadata (from explicit LinkedIn connect)
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
    
    // Direct the user to connect their LinkedIn account
    console.log("[LINKEDIN_SCHEDULE] No LinkedIn token found");
    return NextResponse.json(
      { error: "LinkedIn account not connected. Please click the 'Connect LinkedIn' button at the top of the page to authorize posting to your account." },
      { status: 400 }
    );
    
  } catch (error: unknown) {
    console.error("[LINKEDIN_SCHEDULE_ERROR]", error);
    return NextResponse.json(
      { 
        error: "Failed to publish post to LinkedIn", 
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
  
  // Use type assertion to avoid TypeScript errors
  const postData: any = {
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
  
  // Check for the post ID in the response headers
  const postId = response.headers.get('X-RestLi-Id');
  
  console.log("[LINKEDIN_SCHEDULE] Success! LinkedIn post created");
  return NextResponse.json({
    success: true,
    message: "Post published successfully on LinkedIn",
    postId: postId || linkedInResponse.id,
    response: linkedInResponse
  });
} 