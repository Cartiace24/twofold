export type ID = string;

export interface Profile {
  id: ID;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  avatar_path?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface Couple {
  id: ID;
  name: string;
  together_since: string; // ISO date
  description?: string;
  accent?: string;
  cover_url?: string | null;
  avatar_a_url?: string | null;
  avatar_b_url?: string | null;
  invite_code: string;
}

export interface MemoryPhoto {
  id: ID;
  url: string;
  caption?: string;
  sort: number;
}

export interface Memory {
  id: ID;
  couple_id: ID;
  title: string;
  caption: string;
  date: string; // ISO
  location_label?: string;
  lat?: number | null;
  lng?: number | null;
  tags: string[];
  creator: string;
  favorite: boolean;
  photos: MemoryPhoto[];
  created_at: string;
}

export interface Note {
  id: ID;
  couple_id: ID;
  body: string;
  style: "scrap" | "sticky" | "letter" | "index" | "journal";
  author: string;
  favorite: boolean;
  created_at: string;
  date_label?: string;
}

export interface TimelineEvent {
  id: ID;
  couple_id: ID;
  title: string;
  date: string;
  description?: string;
  photo_url?: string | null;
  location_label?: string;
  created_at: string;
}

export interface Place {
  id: ID;
  couple_id: ID;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  date?: string;
  photo_url?: string | null;
  memory_id?: string | null;
  created_at: string;
}

export type WishlistCategory =
  | "Places"
  | "Food"
  | "Movies"
  | "Experiences"
  | "Trips"
  | "Things to buy"
  | "Random";

export interface WishlistItem {
  id: ID;
  couple_id: ID;
  title: string;
  category: WishlistCategory;
  note?: string;
  done: boolean;
  created_at: string;
}

export const WISHLIST_CATEGORIES: WishlistCategory[] = [
  "Places",
  "Food",
  "Movies",
  "Experiences",
  "Trips",
  "Things to buy",
  "Random",
];
