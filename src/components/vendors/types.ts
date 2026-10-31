/**
 * @fileoverview Type definitions for Vendor Procurement and Quotation Management.
 * @module components/vendors/types
 */

export interface VendorQuoteItem {
  id: string;
  title: string;
  basePriceMinor: number | string;
  additionalFeesMinor: number | string;
  servicesIncluded?: string;
  isAwarded?: boolean;
}

export interface VendorItem {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  location?: string;
  estimatedPriceMinor: number | string;
  rating: number;
  notes?: string;
  bookingStatus: string;
  sourceTag: 'USER_ENTERED' | 'ILLUSTRATIVE_DEMO';
  category?: {
    id: string;
    name: string;
  };
  quotes?: VendorQuoteItem[];
}

export interface VendorCategoryItem {
  id: string;
  name: string;
}

export interface VendorsData {
  success: boolean;
  currency: string;
  categories: VendorCategoryItem[];
  vendors: VendorItem[];
}

