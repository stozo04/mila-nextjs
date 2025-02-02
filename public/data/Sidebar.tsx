import { AiOutlineDashboard } from "react-icons/ai";
import { IoAddCircleOutline } from "react-icons/io5";
import {
  PiCodeBlock,
  PiCodeBlockFill,
  PiEnvelope,
  PiEnvelopeFill,
  PiNewspaperClipping,
  PiNotebook,
  PiNotebookFill,
  PiUser,
  PiUserFill,
} from "react-icons/pi";

export const sidebarsData = [
  {
    id: 1,
    name: "About",
    url: "/",
    icon: <PiUser />,
  },
  {
    id: 2,
    name: "Portfolio",
    url: "/portfolio",
    icon: <PiCodeBlock />,
    numbers: 2,
  },
  {
    id: 3,
    name: "Resume",
    url: "/resume",
    icon: <PiNotebook />,
  },
  {
    id: 4,
    name: "Blog",
    url: "/blog",
    icon: <PiNewspaperClipping />,
  },
  {
    id: 5,
    name: "Contact",
    url: "/contact",
    icon: <PiEnvelope />,
  },
  {
    id: 6,
    name: "Log",
    url: "/log",
    icon: <IoAddCircleOutline />
  },
  {
    id: 7,
    name: "Dashboard",
    url: "/dashboard",
    icon: <AiOutlineDashboard />,
  },
];
export const bottomNavData = [
  {
    id: 1,
    name: "About",
    url: "/",
    icon: <PiUserFill />,
  },
  {
    id: 2,
    name: "Portfolio",
    url: "/portfolio",
    icon: <PiCodeBlockFill />,
    numbers: 2,
  },
  {
    id: 3,
    name: "Resume",
    url: "/resume",
    icon: <PiNotebookFill />,
  },
  {
    id: 4,
    name: "Contact",
    url: "/contact",
    icon: <PiEnvelopeFill />,
  },
  {
    id: 5,
    name: "Log",
    url: "/log",
    icon: <IoAddCircleOutline />
  },
  {
    id: 6,
    name: "Dashboard",
    url: "/dashboard",
    icon: <AiOutlineDashboard />,
  },
];
