import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/clerk-sdk-node";

// Auto-connect using environment variables
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const envToken = process.env.LINKEDIN_ACCESS_TOKEN;
    const orgId = process.env.LINKEDIN_ORGANIZATION_ID;
    
    if (!envToken || !orgId) {
      console.error("[LINKEDIN_AUTO_CONNECT] Missing environment variables");
      return NextResponse.json(
        { error: "LinkedIn configuration missing" },
        { status: 500 }
      );
    }
    
    try {
      // Update the user's metadata
      await clerkClient.users.updateUser(userId, {
        publicMetadata: {
          linkedInConnected: true,
        },
        privateMetadata: {
          linkedInToken: envToken,
          linkedInId: orgId,
          linkedInTokenExpiry: Date.now() + (60 * 24 * 60 * 60 * 1000), // Set expiry to 60 days from now
        }
      });
      
      console.log("[LINKEDIN_AUTO_CONNECT] Successfully auto-connected LinkedIn");
      return NextResponse.json({
        success: true,
        message: "LinkedIn account auto-connected"
      });
    } catch (err) {
      console.error("[LINKEDIN_AUTO_CONNECT] Clerk update error", err);
      return NextResponse.json(
        { error: "Failed to update user metadata" },
        { status: 500 }
      );
    }
    
  } catch (error: unknown) {
    console.error("[LINKEDIN_AUTO_CONNECT_ERROR]", error);
    return NextResponse.json(
      { 
        error: "Failed to auto-connect LinkedIn account", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 