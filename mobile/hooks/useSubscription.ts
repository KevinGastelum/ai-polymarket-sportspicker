/**
 * React hook for managing subscription state
 */

import { useState, useEffect, useCallback } from 'react';
import { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import {
  initializePurchases,
  getOfferings,
  purchasePackage,
  restorePurchases,
  checkProStatus,
  SubscriptionState,
} from '../services/purchases';
import { supabase } from '../services/supabase';

export function useSubscription(): SubscriptionState {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);

  // Initialize RevenueCat and load offerings + Check Supabase Profile
  useEffect(() => {
    async function init() {
      try {
        await initializePurchases();

        // Check for Bypass Env (Expo 49+ uses EXPO_PUBLIC_)
        if (process.env.EXPO_PUBLIC_BYPASS_PREMIUM_LOCKS === 'true' || process.env.NEXT_PUBLIC_BYPASS_PREMIUM_LOCKS === 'true') {
          console.log('Bypassing Premium Locks via Env');
          setIsPro(true);
          setLoading(false);
          return;
        }
        
        // 1. Check RevenueCat Status
        const [rcProStatus, currentOfferings] = await Promise.all([
          checkProStatus(),
          getOfferings(),
        ]);
        
        let finalProStatus = rcProStatus;

        // 2. Check Supabase Profile (Fallback/Sync)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('subscription_tier, is_pro')
              .eq('id', session.user.id)
              .single();
            
            if (profile) {
              // If Supabase says Pro (e.g. from Web Stripe or Manual), grant access
              if (profile.subscription_tier === 'pro' || profile.subscription_tier === 'premium' || profile.is_pro) {
                finalProStatus = true;
              }
            }
          }
        } catch (err) {
          console.log('Supabase profile check failed:', err);
        }
        
        setIsPro(finalProStatus);
        setOfferings(currentOfferings);
      } catch (error) {
        console.error('Failed to initialize purchases:', error);
        // Default to false but don't crash
        setIsPro(false);
      } finally {
        setLoading(false);
      }
    }
    
    init();
  }, []);

  // Purchase a package
  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    setLoading(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.success) {
        setIsPro(true);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore purchases
  const restore = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const result = await restorePurchases();
      if (result.isPro) {
        setIsPro(true);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh subscription status
  const refresh = useCallback(async (): Promise<void> => {
    const proStatus = await checkProStatus();
    setIsPro(proStatus);
  }, []);

  return {
    isPro,
    loading,
    offerings,
    purchase,
    restore,
    refresh,
  };
}
