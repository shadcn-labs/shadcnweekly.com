const CREATOR_ROLE = "Creator of";

export const TESTIMONIALS = [
  {
    avatar: "https://francoisbest.com/avatar.jpg",
    avatarDarkClass: "",
    highlight: "very neat collection of resources",
    name: "François Best",
    project: {
      name: "nuqs",
      url: "https://nuqs.dev",
    },
    quote:
      "It’s a very neat collection of resources to keep up with the ever-growing shadcn ecosystem.",
    role: CREATOR_ROLE,
    url: "https://x.com/fortysevenfx",
  },
  {
    avatar: "https://withden.dev/images/avatar-light.png",
    avatarDarkClass: "dark:invert",
    highlight: "good stuff, no noise",
    name: "Denish",
    project: {
      name: "PaceUI",
      url: "https://paceui.com/",
    },
    quote:
      "Shadcn Weekly brings you the best in the ecosystem every Monday. All the good stuff, no noise.",
    role: CREATOR_ROLE,
    url: "https://x.com/withden_",
  },
  {
    avatar: "https://cdn.shadcnstudio.com/blogs/authors/ajay-patel.png",
    avatarDarkClass: "",
    highlight: "My Monday isn’t complete without Shadcn Weekly.",
    name: "Ajay Patel",
    project: {
      name: "Shadcn Studio",
      url: "https://shadcnstudio.com/",
    },
    quote:
      "My Monday isn’t complete without Shadcn Weekly. It’s the easiest way I keep up with the shadcn ecosystem.",
    role: CREATOR_ROLE,
    url: "https://x.com/ajaypatel_aj",
  },
] as const;
