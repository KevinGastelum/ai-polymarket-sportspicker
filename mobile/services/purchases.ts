/**
 * RevenueCat Subscription Service for PolyPick
 * 
 * Handles in-app purchases and subscription management.
 * Configure with your RevenueCat API key before use.
 */

import Purchases, { 
  PurchasesPackage, 
  CustomerInfo,
  PurchasesOffering
} from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API Keys (replace with your actual keys)
const REVENUECAT_API_KEY_IOS = 'YOUR_IOS_API_KEY';
const REVENUECAT_API_KEY_ANDROID = 'YOUR_ANDROID_API_KEY';

// Entitlement identifiers
export const ENTITLEMENTS = {
  PRO: 'pro_access',
  PREMIUM: 'premium_access',
};

// Product identifiers
export const PRODUCTS = {
  ANNUAL: 'polypick_annual_pro',
  MONTHLY: 'polypick_monthly_pro',
};

/**
 * Initialize RevenueCat SDK
 * Call this once when app starts (e.g., in App.tsx useEffect)
 */
export async function initializePurchases(): Promise<void> {
  const apiKey = Platform.OS === 'ios' 
    ? REVENUECAT_API_KEY_IOS 
    : REVENUECAT_API_KEY_ANDROID;
  
  await Purchases.configure({ apiKey });
  
  // Enable debug logs in development
  if (__DEV__) {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    
    // Check if purchase granted pro access
    const isPro = customerInfo.entitlements.active[ENTITLEMENTS.PRO] !== undefined;
    
    return { success: isPro, customerInfo };
  } catch (error: any) {
    // User cancelled purchase
    if (error.userCancelled) {
      return { success: false, error: 'Purchase cancelled' };
    }
    
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases (e.g., after reinstall)
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPro: boolean;
  error?: string;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active[ENTITLEMENTS.PRO] !== undefined;
    
    return { success: true, isPro };
  } catch (error: any) {
    return { success: false, isPro: false, error: error.message };
  }
}

/**
 * Check if user has active Pro subscription
 */
export async function checkProStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENTS.PRO] !== undefined;
  } catch (error) {
    console.error('Error checking pro status:', error);
    return false;
  }
}

/**
 * Get customer info including subscription details
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Error getting customer info:', error);
    return null;
  }
}

// Subscription state hook for React components
export interface SubscriptionState {
  isPro: boolean;
  loading: boolean;
  offerings: PurchasesOffering | null;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
}
