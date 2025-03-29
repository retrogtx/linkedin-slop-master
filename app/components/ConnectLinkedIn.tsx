import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Linkedin, AlertTriangle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export function ConnectLinkedIn() {
  const { toast } = useToast();
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if user has LinkedIn connected
  const isLinkedInConnected = isLoaded && user?.publicMetadata?.linkedInConnected === true;
  
  const handleConnect = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/linkedin/auth');
      const data = await response.json();
      
      if (data.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }
      
      if (data.authUrl) {
        // Redirect to LinkedIn authorization
        window.location.href = data.authUrl;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to LinkedIn',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDisconnect = async () => {
    setIsLoading(true);
    
    try {
      // We would call an API to disconnect LinkedIn
      // For now, we'll just show a toast
      toast({
        title: 'Coming Soon',
        description: 'Disconnecting LinkedIn accounts will be available soon.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect LinkedIn',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isLoaded) {
    return <Button variant="outline" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>;
  }
  
  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {!isLinkedInConnected && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md max-w-md">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
            <div>
              <h3 className="font-semibold">Connection Required</h3>
              <p className="text-sm mt-1">
                You must connect your LinkedIn account to post content. This grants our app permission to post on your behalf.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {isLinkedInConnected ? (
        <Button
          size="lg"
          variant="outline"
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-6"
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Linkedin className="mr-2 h-5 w-5" />
          )}
          LinkedIn Connected
        </Button>
      ) : (
        <Button
          size="lg"
          variant="default"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          onClick={handleConnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Linkedin className="mr-2 h-5 w-5" />
          )}
          Connect LinkedIn
        </Button>
      )}
    </div>
  );
} 