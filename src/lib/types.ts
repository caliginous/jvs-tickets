export interface Author {
  node: {
    name: string;
  };
}

export interface FeaturedImage {
  node: {
    sourceUrl: string;
    altText: string;
  };
}

export interface Category {
  nodes: Array<{
    name: string;
    slug: string;
  }>;
}

export interface Tag {
  nodes: Array<{
    name: string;
    slug: string;
  }>;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  date: string;
  author?: {
    node: {
      name: string;
    };
  };
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText: string;
    };
  };
  categories?: {
    nodes: Array<{
      name: string;
      slug: string;
    }>;
  };
  tags?: {
    nodes: Array<{
      name: string;
      slug: string;
    }>;
  };
  eventDate?: string;
  eventVenue?: string;
  eventPrice?: string;
  isEvent?: boolean;
}

export interface EventFields {
  venue: string;
  price: string;
  rsvpLink: string;
  description: string;
}

export interface Event extends Post {
  eventFields?: {
    venue: string;
    price: string;
    rsvpLink: string;
    description: string;
  };
}

export interface RecipeFields {
  ingredients: string;
  instructions: string;
  cookTime: string;
  servings: string;
  heroImage: FeaturedImage;
}

export interface RecipeImage {
  sourceUrl: string;
  altText: string;
  title: string;
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  content: string;
  featuredImageUrl?: string;
  ingredients?: string;
  instructions?: string;
  servings?: string;
  preparationTime?: string;
  cookTime?: string;
  difficulty?: string;
  categories?: string[];
  tags?: string[];
  views?: number;
  jvsTestField?: string;
  source?: 'wordpress' | 'sanity'; // Source of the recipe
  createdAt?: string; // Unified creation date
  updatedAt?: string; // Unified update date
}

export interface GetRecipesResponse {
  recipes: Recipe[];
}

export interface GetRecipeBySlugResponse {
  recipes: Recipe[];
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content?: string;
  date: string;
}

// Custom Event Product interface
export interface EventProduct {
  id: string;
  name: string;
  price: string;
  shortDescription?: string;
  featuredImageUrl?: string;
  eventDate: string;
  eventEndDate: string;
  eventVenue: string;
  eventPrice: string;
  stockQuantity?: number;
  stockStatus?: string;
  purchasable?: boolean;
  available?: boolean;
  jvsTestField?: string;
  ticketTypes?: TicketType[];
}

export interface TicketType {
  label: string;
  type?: string;
  price: string;
  available?: boolean;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface PostsConnection {
  nodes: Post[];
  pageInfo: PageInfo;
}

export interface EventsConnection {
  nodes: Event[];
  pageInfo: PageInfo;
}

export interface RecipesConnection {
  nodes: Recipe[];
  pageInfo: PageInfo;
}

export interface HomepageData {
  posts: {
    nodes: Post[];
  };
  events: {
    nodes: Event[];
  };
  recipes: {
    nodes: Recipe[];
  };
}

export interface SearchResult {
  posts: {
    nodes: Array<{
      id: string;
      title: string;
      slug: string;
      excerpt: string;
      date: string;
      postTypeName: string;
    }>;
  };
  events: {
    nodes: Array<{
      id: string;
      title: string;
      slug: string;
      date: string;
      postTypeName: string;
    }>;
  };
  recipes: {
    nodes: Array<{
      id: string;
      title: string;
      slug: string;
      postTypeName: string;
    }>;
  };
} 