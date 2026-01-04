import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

export function useSubscription() {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      // Check for bypass environment variable
      if (process.env.NEXT_PUBLIC_BYPASS_PREMIUM_LOCKS === 'true') {
        setIsPro(true);
        setLoading(false);
        return;
      }

      // If no user, definitely not pro
      if (!user) {
        setIsPro(false);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('subscription_tier, is_pro')
          .eq('id', user.id)
          .single();

        // Check for 'pro' or 'premium' tier, or explicit is_pro flag
        if (data && (
          data.subscription_tier === 'pro' || 
          data.subscription_tier === 'premium' || 
          data.is_pro === true
        )) {
          setIsPro(true);
        } else {
          setIsPro(false);
        }
      } catch (e) {
        console.error('Error checking subscription:', e);
        setIsPro(false);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [user]);

  return { isPro, loading };
}
