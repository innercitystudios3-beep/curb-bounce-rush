import { supabase } from "@/integrations/supabase/client";

export interface PurchaseResult {
  success: boolean;
  error?: string;
  itemId?: string;
  itemType?: 'ball' | 'backdrop';
}

/**
 * Initiates a Stripe checkout for an in-app purchase
 */
export const initiateStripePurchase = async (
  itemId: string,
  itemName: string
): Promise<{ url: string | null; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-iap-checkout', {
      body: { itemId, itemName },
    });

    if (error) {
      console.error('Error creating checkout session:', error);
      return { url: null, error: error.message };
    }

    if (data?.url) {
      return { url: data.url };
    }

    return { url: null, error: 'No checkout URL returned' };
  } catch (err) {
    console.error('Error initiating purchase:', err);
    return { url: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

/**
 * Verifies a completed purchase using the session ID
 */
export const verifyPurchase = async (
  sessionId: string
): Promise<PurchaseResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-iap-purchase', {
      body: { sessionId },
    });

    if (error) {
      console.error('Error verifying purchase:', error);
      return { success: false, error: error.message };
    }

    if (data?.verified) {
      return {
        success: true,
        itemId: data.itemId,
        itemType: data.itemType,
      };
    }

    return { success: false, error: 'Payment not verified' };
  } catch (err) {
    console.error('Error verifying purchase:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

/**
 * Checks URL parameters for purchase results after Stripe redirect
 */
export const checkPurchaseRedirect = (): {
  isPurchaseSuccess: boolean;
  isPurchaseCancelled: boolean;
  itemId: string | null;
  itemType: string | null;
  sessionId: string | null;
} => {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    isPurchaseSuccess: urlParams.get('purchase_success') === 'true',
    isPurchaseCancelled: urlParams.get('purchase_cancelled') === 'true',
    itemId: urlParams.get('item_id'),
    itemType: urlParams.get('item_type'),
    sessionId: urlParams.get('session_id'),
  };
};

/**
 * Clears purchase-related URL parameters
 */
export const clearPurchaseParams = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('purchase_success');
  url.searchParams.delete('purchase_cancelled');
  url.searchParams.delete('item_id');
  url.searchParams.delete('item_type');
  url.searchParams.delete('session_id');
  window.history.replaceState({}, '', url.pathname);
};
