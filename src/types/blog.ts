export type Blog = {
  id: number;
  title: string;
  slug: string;
  content: string;
  date: string;
  tag: string;
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

export interface JourneyCard {
  title: string;
  message: string;
  slug: string;
  date: string;
}

export const journeyCards: JourneyCard[] = [
  { title: "My First Week", message: "Finally Home!", slug: "birthday-week",  date: "May 30 - June 4, 2023"},
  { title: "One Month Old", message: "Growing so fast!", slug: "one-month", date: "May 30 - June 30, 2023" },
  { title: "Two Month Old", message: "Learning and Growing!", slug: "two-months", date: "June 30 - July 30, 2023" },
  { title: "Three Month Old", message: "Finding My Hands and Fingers", slug: "three-months", date: "July 30 - August 30, 2023" },
  { title: "Christening", message: "Baptized As Orthodox Christian", slug: "baptism", date: "September 23, 2023" },
  { title: "Four Month Old", message: "Rolling & Cooing", slug: "four-months", date: "August 30 - September 30, 2023" },
  { title: "Five Month Old", message: "Daycare & Growing Up", slug: "five-months", date: "September 30 - October 30, 2023" },
  { title: "Six Month Old", message: "Half A Year", slug: "six-months", date: "October 30 - November 30, 2023" },
  { title: "Seven Month Old", message: "Holiday Season", slug: "seven-months", date: "November 30 - December 30, 2023" },
  { title: "Eight Month Old", message: "My First Tooth", slug: "eight-months", date: "December 30 - January 30, 2024" },
  { title: "Nine Month Old", message: "Standing & Pulling Up", slug: "nine-months", date: "January 30 - February 30, 2024" },
  { title: "Ten Month Old", message: "Earnend My Wings (Flight to Beaver Creek, CO)", slug: "ten-months", date: "February 30 - March 30, 2024" },
  { title: "Eleven Month Old", message: "Christian Easter", slug: "eleven-months", date: "March 30 - April 30, 2024" },
  { title: "Twelve Month Old", message: "One Year Old", slug: "twelve-months", date: "April 30 - May 30, 2024" },
].reverse();
