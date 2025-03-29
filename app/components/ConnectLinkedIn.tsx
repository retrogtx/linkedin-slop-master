import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Linkedin } from 'lucide-react';
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
    <>
      {isLinkedInConnected ? (
        <Button
          variant="outline"
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Linkedin className="mr-2 h-4 w-4" />
          )}
          LinkedIn Connected
        </Button>
      ) : (
        <Button
          variant="outline"
          className="border-blue-600 bg-white text-blue-600 hover:bg-blue-50"
          onClick={handleConnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Linkedin className="mr-2 h-4 w-4" />
          )}
          Connect LinkedIn
        </Button>
      )}
    </>
  );
} 