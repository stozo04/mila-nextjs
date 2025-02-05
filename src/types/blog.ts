export type Blog = {
  id: number;
  title: string;
  slug: string;
  content: string;
  date: string;
  featured_image: string; // Single image for blog list
  detail_image: string; // Single image for blog details
}

// Interface for Blog List Component
export interface BlogListItemProps {
  id: number;
  title: string;
  slug: string;
  date: string;
  featured_image: string;
}

// Interface for Blog Details Component
export interface BlogDetailProps extends BlogListItemProps {
  content: string;
  detail_image: string;
}
